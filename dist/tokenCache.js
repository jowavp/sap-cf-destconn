"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setToken = exports.getToken = void 0;
const tokens = {};
function getToken(key) {
    cleanCache();
    const cacheToken = tokens[key];
    if (cacheToken) {
        return cacheToken.value;
    }
}
exports.getToken = getToken;
async function setToken(key, tokenProm) {
    cleanCache();
    if (tokenProm) {
        const token = await tokenProm;
        const validUntil = (new Date()).getTime() + ((token.expires_in || 30 * 60) * 1000);
        tokens[key] = {
            requested: new Date(),
            validUntil,
            value: token
        };
        return token;
    }
}
exports.setToken = setToken;
async function cleanCache() {
    // 1 hour ago
    // const tokenlifetimeago = new Date().getTime() - (60 * 60 * 1000);
    const now = new Date().getTime();
    Object.entries(tokens).forEach(function ([key, value]) {
        // if( value.requested.getTime() < tokenlifetimeago ) {
        if (value.validUntil < now) {
            delete tokens[key];
        }
    });
}
