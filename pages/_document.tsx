import { DocumentProps, Head, Html, Main, NextScript } from 'next/document';

import i18nextConfig from '../next-i18next.config';

type Props = DocumentProps & {
  // add custom document props
};

export default function Document(props: Props) {
  const currentLocale =
    props.__NEXT_DATA__.locale ?? i18nextConfig.i18n.defaultLocale;
  return (
    <Html lang={currentLocale}>
      <Head>
        <meta name="mobile-web-app-capable" content="yes"></meta>
        <meta name="apple-mobile-web-app-title" content="Genie"></meta>
         {/* <!-- For iOS Full-Screen Web App --> */}
        <meta name="apple-mobile-web-app-capable" content="yes"></meta>
        {/* <!-- For iOS App icons --> */}
        <link rel="apple-touch-icon" href="/path/to/icon.png"></link>
        {/* <!-- Additional meta tags for mobile compatibility --> */}
       
       <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;800&display=swap&ital,wght@0,300..800;1,300..800" rel="stylesheet"/>
      </Head>
      <body>

        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
