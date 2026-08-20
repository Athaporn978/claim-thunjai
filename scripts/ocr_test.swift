import Foundation
import Vision
import AppKit
import PDFKit

let args = CommandLine.arguments
if args.count < 2 {
    print("Usage: ocr_test <pdf_path>")
    exit(1)
}

let path = args[1]
let url = URL(fileURLWithPath: path)
guard let doc = PDFDocument(url: url) else { print("Failed to load PDF"); exit(1) }

print("Total Pages: \(doc.pageCount)")
if let page = doc.page(at: 1) { // Page 2
    let pageRect = page.bounds(for: .mediaBox)
    let image = NSImage(size: pageRect.size)
    image.lockFocus()
    if let ctx = NSGraphicsContext.current?.cgContext {
        NSColor.white.set()
        ctx.fill(pageRect)
        page.draw(with: .mediaBox, to: ctx)
    }
    image.unlockFocus()

    if let tiffData = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiffData), let cgImage = bitmap.cgImage {
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNRecognizeTextRequest { req, err in
            guard let results = req.results as? [VNRecognizedTextObservation] else { return }
            for obs in results {
                if let text = obs.topCandidates(1).first?.string {
                    print(text)
                }
            }
        }
        request.recognitionLanguages = ["th-TH", "en-US"]
        request.usesLanguageCorrection = true
        try? handler.perform([request])
    }
}
