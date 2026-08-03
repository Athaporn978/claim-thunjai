import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// MOCK 3rd-party connector. In production this calls the insurer's core-system
// API (adapter pattern). Here it returns canned case data for any claim number
// so the "fetch by claim number" flow is demoable without a real integration.
export async function POST(req: NextRequest) {
  const { claimNumber } = (await req.json()) as { claimNumber?: string };
  if (!claimNumber) return NextResponse.json({ error: "claimNumber required" }, { status: 400 });

  await new Promise((r) => setTimeout(r, 600)); // simulate network

  // deterministic mock based on the claim number
  const samples = [
    { customer: "สมชาย ใจดี", licensePlate: "กข-1234", vehicleMake: "Toyota", vehicleModel: "Camry", vehicleYear: 2022, policyNo: "POL-99012", insurer: "Allianz Ayudhya" },
    { customer: "Naruto Yamada", licensePlate: "ขค-5678", vehicleMake: "Honda", vehicleModel: "Civic", vehicleYear: 2023, policyNo: "POL-77341", insurer: "AIG Thailand" },
    { customer: "Anna Müller", licensePlate: "คง-9012", vehicleMake: "Mercedes-Benz", vehicleModel: "C-Class", vehicleYear: 2024, policyNo: "POL-55220", insurer: "AIG Thailand" },
  ];
  const pick = samples[Math.abs([...claimNumber].reduce((a, c) => a + c.charCodeAt(0), 0)) % samples.length];

  return NextResponse.json({
    found: true,
    source: "MockInsurerCore",
    claimNumber,
    data: pick,
  });
}
