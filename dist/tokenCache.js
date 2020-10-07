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
function setToken(key, token) {
    cleanCache();
    if (token) {
        tokens[key] = {
            requested: new Date(),
            value: token
        };
        return token;
    }
}
exports.setToken = setToken;
function cleanCache() {
    // 1 hour ago
    const tokenlifetimeago = new Date().getTime() - (60 * 60 * 1000);
    Object.entries(tokens).forEach(function ([key, value]) {
        if (value.requested.getTime() < tokenlifetimeago) {
            delete tokens[key];
        }
    });
}
