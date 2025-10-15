/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false, // hides the spinning "N"
    appIsrStatus: false,  // (optional) hides ISR status pill
  },
};

export default nextConfig;
