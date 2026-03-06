// Peggy shim - parsers are pre-compiled, no runtime generation needed
export function generate() {
    throw new Error('Peggy runtime generation is disabled. Use pre-compiled parsers.');
}
export default { generate };
