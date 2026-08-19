import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/server";
import { SbUserRepository } from "@/backend/infrastructure/repositories/SbUserRepository";
import { CreateSignupUseCase } from "@/backend/application/signup/usecases/CreateSignupUsecase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userRepository = new SbUserRepository(supabaseAdmin);
    const signupUseCase = new CreateSignupUseCase(userRepository);

    const result = await signupUseCase.execute(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
