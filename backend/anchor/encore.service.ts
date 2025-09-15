import { Service } from "encore.dev/service";

export default new Service("anchor");

// Ensure tree-shaking doesn't drop our admin endpoint
export { adminMint } from "./mint";
