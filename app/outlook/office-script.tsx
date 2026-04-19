"use client";

import Script from "next/script";

export function OfficeScript() {
  return (
    <Script
      src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"
      strategy="afterInteractive"
    />
  );
}
