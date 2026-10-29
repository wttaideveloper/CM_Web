import { NextRequest, NextResponse } from "next/server";

import {
  invalidTrainingCategoryIdResponse,
  isTrainingCategoryId,
  proxyTrainingCategoryRequest,
} from "../_lib";

type Context = { params: Promise<{ categoryId: string }> };

/** Updates one Training taxonomy entry without changing its parent relationship. */
export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const { categoryId } = await params;
  return isTrainingCategoryId(categoryId)
    ? proxyTrainingCategoryRequest(request, categoryId)
    : invalidTrainingCategoryIdResponse();
}

/** Deletes one Training taxonomy entry through the authenticated Super Admin BFF. */
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const { categoryId } = await params;
  return isTrainingCategoryId(categoryId)
    ? proxyTrainingCategoryRequest(request, categoryId)
    : invalidTrainingCategoryIdResponse();
}
