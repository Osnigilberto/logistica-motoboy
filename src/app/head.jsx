export const metadata = {
  title: "Logística Motoboy",
  description: "Plataforma de entregas rápidas com motoboys parceiros",
};

export default function Head() {
  return (
    <>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <link rel="manifest" href="/manifest.json" />

      
      {/* Favicon padrão */}
      <link rel="icon" href="/favicon.ico" />

      {/* Favicons para vários dispositivos e tamanhos */}
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      
      {/* Cor da barra do navegador em mobile */}
      <meta name="theme-color" content="#ca6c3d" />
    </>
  );
}

