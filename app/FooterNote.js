"use client";
import { useRouter } from "next/navigation";
import PrivateNote from "./PrivateNote";

export default function FooterNote() {
  const router = useRouter();
  return <PrivateNote onNeedLogin={() => router.push("/connexion")} />;
}
