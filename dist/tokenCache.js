"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function setToken(key, tokenProm) {
    return __awaiter(this, void 0, void 0, function* () {
        cleanCache();
        if (tokenProm) {
            const token = yield tokenProm;
            const validUntil = (new Date()).getTime() + ((token.expires_in || 30 * 60) * 1000);
            tokens[key] = {
                requested: new Date(),
                validUntil,
                value: token
            };
            return token;
        }
    });
}
exports.setToken = setToken;
function cleanCache() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1 hour ago
        // const tokenlifetimeago = new Date().getTime() - (60 * 60 * 1000);
        const fiveMinutesAgo = new Date().getTime() - (5 * 60 * 1000);
        Object.entries(tokens).forEach(function ([key, value]) {
            // if( value.requested.getTime() < tokenlifetimeago ) {
            if (value.validUntil < fiveMinutesAgo) {
                delete tokens[key];
            }
        });
    });
}
