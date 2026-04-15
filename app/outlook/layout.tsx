import Script from "next/script";

export const metadata = {
  title: "ChatUI - Email Assistant",
};

export default function OutlookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
