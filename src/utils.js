// src/utils.js

/**
 * 从 KV 命名空间获取 JSON 数据
 * @param {KVNamespace} kvNamespace
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getJsonFromKv(kvNamespace, key) {
	try {
		const value = await kvNamespace.get(key);
		if (value === null) {
			return null; // Key 不存在
		}
		return JSON.parse(value);
	} catch (error) {
		console.error(`从 KV 获取 JSON 数据失败，key: ${key}, 错误:`, error);
		return null; // 解析 JSON 失败或 KV 错误
	}
}

/**
 * 向 KV 命名空间存储 JSON 数据
 * @param {KVNamespace} kvNamespace
 * @param {string} key
 * @param {any} jsonData
 * @returns {Promise<void>}
 */
export async function putJsonToKv(kvNamespace, key, jsonData) {
	try {
		await kvNamespace.put(key, JSON.stringify(jsonData));
	} catch (error) {
		console.error(`向 KV 存储 JSON 数据失败，key: ${key}, 数据:`, jsonData, "错误:", error);
	}
}


/**
 * 将字符串编码为 Base64
 * @param {string} str
 * @returns {string}
 */
export function base64Encode(str) {
	return btoa(str);
}

/**
 * 将 Base64 字符串解码为字符串
 * @param {string} base64Str
 * @returns {string}
 */
export function base64Decode(base64Str) {
	return atob(base64Str);
}

/**
 * 获取用户白名单
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @returns {Promise<Array<number>>}
 */
export async function getUserWhitelist(botConfigKvNamespace, userWhitelistKey) {
	return await getJsonFromKv(botConfigKvNamespace, userWhitelistKey) || []; // 默认返回空数组
}

/**
 * 向用户白名单添加用户
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function addUserToWhitelist(botConfigKvNamespace, userWhitelistKey, userId) {
	let whitelist = await getUserWhitelist(botConfigKvNamespace, userWhitelistKey);
	if (!whitelist.includes(userId)) {
		whitelist.push(userId);
		await putJsonToKv(botConfigKvNamespace, userWhitelistKey, whitelist);
		console.log(`用户 ${userId} 已添加到用户白名单`);
	} else {
		console.log(`用户 ${userId} 已在用户白名单中，无需重复添加`);
	}
}

/**
 * 从用户白名单移除用户
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function removeUserFromWhitelist(botConfigKvNamespace, userWhitelistKey, userId) {
	let whitelist = await getUserWhitelist(botConfigKvNamespace, userWhitelistKey);
	const index = whitelist.indexOf(userId);
	if (index > -1) {
		whitelist.splice(index, 1);
		await putJsonToKv(botConfigKvNamespace, userWhitelistKey, whitelist);
		console.log(`用户 ${userId} 已从用户白名单移除`);
	} else {
		console.log(`用户 ${userId} 不在用户白名单中，无法移除`);
	}
}

/**
 * 检查用户是否在用户白名单中
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} userWhitelistKey
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function isUserWhitelisted(botConfigKvNamespace, userWhitelistKey, userId) {
	const whitelist = await getUserWhitelist(botConfigKvNamespace, userWhitelistKey);
	return whitelist.includes(userId);
}


/**
 * 向群组白名单添加群组
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} groupWhitelistKey
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function addGroupToWhitelist(botConfigKvNamespace, groupWhitelistKey, groupId) {
	let whitelist = await getGroupWhitelist(botConfigKvNamespace, groupWhitelistKey);
	if (!whitelist.includes(groupId)) {
		whitelist.push(groupId);
		await putJsonToKv(botConfigKvNamespace, groupWhitelistKey, whitelist);
		console.log(`群组 ${groupId} 已添加到群组白名单`);
	} else {
		console.log(`群组 ${groupId} 已在群组白名单中，无需重复添加`);
	}
}

/**
 * 从群组白名单移除群组
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} groupWhitelistKey
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function removeGroupFromWhitelist(botConfigKvNamespace, groupWhitelistKey, groupId) {
	let whitelist = await getGroupWhitelist(botConfigKvNamespace, groupWhitelistKey);
	const index = whitelist.indexOf(groupId);
	if (index > -1) {
		whitelist.splice(index, 1);
		await putJsonToKv(botConfigKvNamespace, groupWhitelistKey, whitelist);
		console.log(`群组 ${groupId} 已从群组白名单移除`);
	} else {
		console.log(`群组 ${groupId} 不在群组白名单中，无法移除`);
	}
}

/**
 * 获取群组白名单 (为了内部复用，虽然 index.js 中已经有相同的代码)
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} groupWhitelistKey
 * @returns {Promise<Array<number>>}
 */
export async function getGroupWhitelist(botConfigKvNamespace, groupWhitelistKey) {
	return await getJsonFromKv(botConfigKvNamespace, groupWhitelistKey) || [];
}
