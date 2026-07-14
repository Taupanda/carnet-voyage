"use client";
import { useState } from "react";
import Social from "./Social";
import AuthModal from "./AuthModal";

export default function PostSocial({ entryDate }) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <Social entryDate={entryDate} onNeedLogin={() => setAsk(true)} />
      {ask && <AuthModal onClose={() => setAsk(false)} />}
    </>
  );
}
