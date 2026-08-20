import Foundation
import Vision
import AppKit
import PDFKit

func processPDF(pdfPath: String) {
    let url = URL(fileURLWithPath: pdfPath)
    guard let doc = PDFDocument(url: url) else {
        print("ERROR: Cannot load PDF at \(pdfPath)")
        return
    }

    print("Processing PDF with Apple Vision OCR: \(url.lastPathComponent) (Total Pages: \(doc.pageCount))...")

    for pageIndex in 0..<doc.pageCount {
        guard let page = doc.page(at: pageIndex) else { continue }
        let pageBounds = page.bounds(for: .mediaBox)
        
        // Render page at 2.0x scale for crisp 300 DPI OCR quality
        let scale: CGFloat = 2.0
        let targetSize = CGSize(width: pageBounds.width * scale, height: pageBounds.height * scale)

        let image = NSImage(size: targetSize)
        image.lockFocus()
        if let ctx = NSGraphicsContext.current?.cgContext {
            NSColor.white.set()
            ctx.fill(CGRect(origin: .zero, size: targetSize))
            ctx.scaleBy(x: scale, y: scale)
            page.draw(with: .mediaBox, to: ctx)
        }
        image.unlockFocus()

        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let cgImage = bitmap.cgImage else { continue }

        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNRecognizeTextRequest()
        request.recognitionLanguages = ["th-TH", "en-US"]
        request.usesLanguageCorrection = true
        request.recognitionLevel = .accurate

        do {
            try requestHandler.perform([request])
            guard let results = request.results else { continue }
            print("--- PAGE \(pageIndex + 1) ---")
            for observation in results {
                if let candidate = observation.topCandidates(1).first {
                    print(candidate.string)
                }
            }
        } catch {
            print("OCR Error on page \(pageIndex + 1): \(error)")
        }
    }
}

let args = CommandLine.arguments
if args.count < 2 {
    print("Usage: ford_vision_ocr <pdf_path>")
    exit(1)
}

processPDF(pdfPath: args[1])
