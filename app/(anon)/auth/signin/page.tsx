"use client";
import { useState } from "react";
import axios from "@/utils/axios";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/app/stores/userStore";
import useLoading from "@/app/hooks/useLoading";
import { SubmitButton } from "@/app/components";

export default function SigninPage() {
  const router = useRouter();
  const { login } = useUserStore();
  const [loading, setIsLoading] = useLoading(false);

  const [form, setForm] = useState({
    loginId: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showTestAccountConfirm, setShowTestAccountConfirm] = useState(false);

  const signIn = async (loginId: string, password: string) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("/auth/signin", {
        loginId,
        password,
      });

      if (response.data.result?.user) {
        login(response.data.result.user);
        router.replace("/");
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.error || "로그인에 실패했습니다.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("로그인에 실패했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(form.loginId, form.password);
  };

  const handleTestAccountLogin = async () => {
    setShowTestAccountConfirm(false);
    await signIn("officalTest@example.com", "off1!123");
  };

  return (
    <div className="flex items-center justify-center text-white max-w-7xl m-auto min-h-[506px] h-[calc(100vh-168px)]">
      <div className="flex flex-col items-center justify-center w-full max-w-md gap-8 bg-white/5 backdrop-blur-lg p-10 rounded-lg border-[1px] border-white/10">
        <h1 className="text-2xl font-bold">로그인</h1>
        <form className="flex flex-col gap-8 w-full" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login_id" className="text-white block mb-2 ">
              이메일
            </label>
            <input
              id="login_id"
              name="loginId"
              type="text"
              className="bg-[#DEFFFD] border border-gray-300 text-gray-900 text-sm rounded-[24px] focus:outline-[#4BBEAB] focus:border-[#56EBE1] block w-full p-2.5"
              placeholder="gmado@example.com"
              value={form.loginId}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-white block mb-2">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="bg-[#DEFFFD] border border-gray-300 text-gray-900 text-sm rounded-[24px] focus:outline-[#4BBEAB] focus:border-[#56EBE1] block w-full p-2.5"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <SubmitButton
            loading={loading}
            text="로그인"
            loadingText="로그인 중..."
            type="submit"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowTestAccountConfirm(true)}
            className="w-full rounded-[24px] border border-[#56EBE1] px-4 py-2 text-[#56EBE1] transition hover:bg-[#56EBE1]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            테스트 계정으로 로그인하기
          </button>
        </form>
        {showTestAccountConfirm && (
          <div className="w-full rounded-lg border border-white/10 bg-black/30 p-4 text-center">
            <p className="mb-4">테스트 계정으로 로그인합니다.</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleTestAccountLogin}
                className="rounded-lg bg-[#56EBE1] px-5 py-2 font-semibold text-slate-950"
              >
                예
              </button>
              <button
                type="button"
                onClick={() => setShowTestAccountConfirm(false)}
                className="rounded-lg border border-white/30 px-5 py-2"
              >
                아니오
              </button>
            </div>
          </div>
        )}
        <div className="w-full h-4">
          {error && <div className="text-red-400 text-center">{error}</div>}
        </div>
        <div className="text-white font-extralight">
          아직 회원이 아니신가요?
          <Link href="/auth/signup" className="font-bold ml-2">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
