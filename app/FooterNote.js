"use client";
import { useState } from "react";
import PrivateNote from "./PrivateNote";
import AuthModal from "./AuthModal";

export default function FooterNote() {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <PrivateNote onNeedLogin={() => setAsk(true)} />
      {ask && <AuthModal onClose={() => setAsk(false)} />}
    </>
  );
}
