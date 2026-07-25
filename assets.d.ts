// Lets TypeScript accept `require("./foo.webp")` for bundled image assets.
// Metro resolves these to an opaque asset id at build time.
declare module "*.webp" {
  const asset: number;
  export default asset;
}
declare module "*.png" {
  const asset: number;
  export default asset;
}
declare module "*.jpg" {
  const asset: number;
  export default asset;
}
