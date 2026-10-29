import { NextRequest } from "next/server";

import { proxyWorkflowRequest } from "../workflow-proxy";

export async function GET(request: NextRequest) { return proxyWorkflowRequest(request, "media", []); }
export async function POST(request: NextRequest) { return proxyWorkflowRequest(request, "media", []); }
export async function PATCH(request: NextRequest) { return proxyWorkflowRequest(request, "media", []); }
export async function DELETE(request: NextRequest) { return proxyWorkflowRequest(request, "media", []); }
