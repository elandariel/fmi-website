// components/PageWrapper.tsx
// Wrapper konsisten untuk semua halaman — padding & max-width seragam
// Cara pakai: bungkus konten halaman dengan <PageWrapper>...</PageWrapper>

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  // Untuk halaman yang butuh full width (tanpa max-width), set maxWidth={false}
  maxWidth?: boolean;
}

export default function PageWrapper({
  children,
  className = '',
  maxWidth = true,
}: PageWrapperProps) {
  return (
    <div
      className={`
        min-h-screen p-5 md:p-7
        ${maxWidth ? 'max-w-[1600px] mx-auto' : ''}
        ${className}
      `}
      style={{ background: '#f0f2f5', fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {children}
    </div>
  );
}