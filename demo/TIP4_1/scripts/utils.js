const isValidTonAddress = (address) => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);

const isNumeric = (value) => /^-?\d+$/.test(value);

module.exports = {
    isValidTonAddress,
    isNumeric
}