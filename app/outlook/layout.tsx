import { OfficeScript } from "./office-script";

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
      <OfficeScript />
      {children}
    </>
  );
}
