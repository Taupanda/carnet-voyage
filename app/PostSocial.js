"use client";
import { useRouter } from "next/navigation";
import Social from "./Social";

export default function PostSocial({ entryDate }) {
  const router = useRouter();
  return <Social entryDate={entryDate} onNeedLogin={() => router.push("/connexion")} />;
}
