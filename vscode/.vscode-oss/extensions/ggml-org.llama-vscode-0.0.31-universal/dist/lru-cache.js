"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUCache = void 0;
const crypto = __importStar(require("crypto"));
class LRUCache {
    constructor(capacity) {
        /**
         * Get the value associated with the key.
         * If the key exists, move it to the most recently used position.
         * @param key The key to retrieve.
         * @returns The value associated with the key, or undefined if the key is not found.
         */
        this.get = (key) => {
            if (!this.map.has(key)) {
                return undefined;
            }
            // Move the key to the most recently used position
            const value = this.map.get(key);
            this.map.delete(key);
            this.map.set(key, value);
            return value;
        };
        /**
         * Insert or update the value associated with the key.
         * If the cache exceeds its capacity, evict the least recently used item.
         * @param key The key to insert or update.
         * @param value The value to associate with the key.
         */
        this.put = (key, value) => {
            if (this.map.has(key)) {
                // If the key exists, delete it to refresh its position
                this.map.delete(key);
            }
            this.map.set(key, value);
            // If capacity is exceeded, evict the least recently used item
            if (this.map.size > this.capacity) {
                const leastRecentlyUsedKey = this.map.keys().next().value;
                if (leastRecentlyUsedKey != undefined) {
                    this.map.delete(leastRecentlyUsedKey);
                }
            }
        };
        /**
         * Get the current size of the cache.
         * @returns The number of items in the cache.
         */
        this.size = () => {
            return this.map.size;
        };
        this.getHash = (request_context) => {
            const hashSha256 = crypto.createHash('sha256');
            return hashSha256.update(request_context).digest('hex');
        };
        this.getMap = () => {
            return this.map;
        };
        if (capacity <= 0) {
            throw new Error("Capacity must be greater than 0");
        }
        this.capacity = capacity;
        this.map = new Map();
    }
}
exports.LRUCache = LRUCache;
//# sourceMappingURL=lru-cache.js.map