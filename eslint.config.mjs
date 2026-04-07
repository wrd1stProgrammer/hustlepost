import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".trigger/**"],
  },
  ...nextVitals,
];

export default config;
