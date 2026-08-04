import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function getOrCreateDefaultInsurer() {
  let insurer = await prisma.insurer.findFirst();
  if (!insurer) {
    insurer = await prisma.insurer.create({
      data: {
        id: "default-insurer",
        name: "บริษัท H TECHNOLOGY ประกันภัย จำกัด",
        nameTh: "บริษัท H TECHNOLOGY ประกันภัย จำกัด",
      },
    });
  }
  return insurer.id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimId, claimNumber, comment, policyHolder, vehicleMake, vehicleModel, licensePlate, overallSeverity } = body;

    let targetClaimId = claimId;

    if (claimId) {
      await prisma.claim.update({
        where: { id: claimId },
        data: {
          status: "reviewed",
          updatedAt: new Date(),
        },
      });
    } else if (claimNumber) {
      const existing = await prisma.claim.findFirst({ where: { claimNumber } });
      if (existing) {
        await prisma.claim.update({
          where: { id: existing.id },
          data: {
            status: "reviewed",
            updatedAt: new Date(),
          },
        });
        targetClaimId = existing.id;
      } else {
        const insurerId = await getOrCreateDefaultInsurer();
        const newClaim = await prisma.claim.create({
          data: {
            claimNumber,
            policyHolder: policyHolder || "ผู้เอาประกัน",
            vehicleMake: vehicleMake || "Toyota",
            vehicleModel: vehicleModel || "Camry",
            licensePlate: licensePlate || "กข-1234",
            insurerId,
            status: "reviewed",
            overallSeverity: overallSeverity || "minor",
          },
        });
        targetClaimId = newClaim.id;
      }
    }

    return NextResponse.json({ success: true, claimId: targetClaimId });
  } catch (err) {
    console.error("Error saving claim:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Save failed" }, { status: 500 });
  }
}
