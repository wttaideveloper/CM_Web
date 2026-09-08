import { NextRequest, NextResponse } from "next/server";

import { invalidEventCategoryIdResponse, isEventCategoryId, proxyEventCategoryRequest } from "../_lib";

type Context = { params: Promise<{ categoryId: string }> };

/** Updates or deletes one Marketplace Event taxonomy entry through the Super Admin BFF. */
export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const { categoryId } = await params;
  return isEventCategoryId(categoryId) ? proxyEventCategoryRequest(request, categoryId) : invalidEventCategoryIdResponse();
}

export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const { categoryId } = await params;
  return isEventCategoryId(categoryId) ? proxyEventCategoryRequest(request, categoryId) : invalidEventCategoryIdResponse();
}
