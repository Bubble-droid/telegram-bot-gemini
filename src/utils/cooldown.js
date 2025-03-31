// src/utils/cooldown.js

import { getJsonFromKv, putJsonToKv, getUserWhitelist } from '../utils/utils';

/**
 * 检查群组是否处于冷却中 (通用冷却 -  用于普通提问)
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} cooldownDuration  冷却时间，例如 "1.5m"
 * @param {number} groupId
 * @param {number} userId
 * @param {Array<number>} userWhitelist  用户白名单
 * @returns {Promise<boolean>}  true 表示处于冷却中，false 表示未冷却
 */
export async function isGroupInCooldown(
	botConfigKvNamespace,
	cooldownDuration,
	groupId,
	userId,
	userWhitelistKey,
	sendTelegramMessage,
	replyToMessageId,
	botToken,
) {
	const userWhitelist = (await getUserWhitelist(botConfigKvNamespace, userWhitelistKey)) || [];

	if (userWhitelist && userWhitelist.includes(userId)) {
		console.log(`白名单用户 ${userId}，跳过通用冷却检查`);
		return false; // 白名单用户不受冷却限制
	}

	//  !!!  通用冷却 Key  !!!
	const lastRequestTimestampKey = `cooldown:${groupId}`;
	const lastRequestTimestamp = (await getJsonFromKv(botConfigKvNamespace, lastRequestTimestampKey)) || 0; // 默认值为 0

	const cooldownMs = parseDurationToMs(cooldownDuration); // 将冷却时间字符串转换为毫秒
	const now = Date.now();
	const elapsedMs = now - lastRequestTimestamp;

	if (elapsedMs < cooldownMs) {
		const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastRequestTimestamp)) / 1000); // 计算剩余秒数
		console.log(`群组 ${groupId} 通用冷却中，剩余 ${remainingSeconds} 秒`); //  !!!  区分日志：通用冷却  !!!

		const replyText = `⏱️ 系统正在冷却中，请等待 ${remainingSeconds} 秒后重试！`; //  构建冷却提示消息
		await sendTelegramMessage(botToken, groupId, replyText, replyToMessageId, 'HTML');

		return true; // 处于冷却中
	} else {
		return false; // 未冷却
	}
}

/**
 * 记录群组的最后请求时间戳 (通用冷却 - 用于普通提问)
 * @param {KVNamespace} botConfigKvNamespace
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function recordGroupRequestTimestamp(botConfigKvNamespace, groupId) {
	//  !!!  通用冷却 Key  !!!
	const lastRequestTimestampKey = `cooldown:${groupId}`;
	const now = Date.now();
	await putJsonToKv(botConfigKvNamespace, lastRequestTimestampKey, now);
	console.log(`群组 ${groupId} 通用冷却已激活，最后请求时间戳已更新`); //  !!!  区分日志：通用冷却  !!!
}

/**
 * 检查群组是否处于搜索冷却中 (独立搜索冷却 - 用于 /search 命令)
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} searchCooldownDuration  搜索冷却时间，例如 "3m"
 * @param {number} groupId
 * @param {number} userId
 * @returns {Promise<boolean>}  true 表示处于搜索冷却中，false 表示未冷却
 */
export async function isGroupInCooldownForSearch(botConfigKvNamespace, searchCooldownDuration, groupId, userId) {
	//  !!!  函数名更明确：isGroupInCooldownForSearch  !!!

	//  !!!  搜索冷却检查，白名单用户不受搜索冷却限制 (保持不变) !!!
	const userWhitelistKey = 'user_whitelist'; //  !!!  用户白名单 Key  !!!
	const userWhitelist = (await getJsonFromKv(botConfigKvNamespace, userWhitelistKey)) || [];
	if (userWhitelist && userWhitelist.includes(userId)) {
		console.log(`白名单用户 ${userId}，跳过搜索冷却检查`);
		return false; // 白名单用户不受搜索冷却限制
	}

	//  !!!  搜索冷却 Key  !!!
	const lastRequestTimestampKey = `cooldown:search:${groupId}`; //  !!!  搜索冷却专用 Key  !!!
	const lastRequestTimestamp = (await getJsonFromKv(botConfigKvNamespace, lastRequestTimestampKey)) || 0; // 默认值为 0

	const cooldownMs = parseDurationToMs(searchCooldownDuration); // 将冷却时间字符串转换为毫秒
	const now = Date.now();
	const elapsedMs = now - lastRequestTimestamp;

	if (elapsedMs < cooldownMs) {
		const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
		console.log(`群组 ${groupId} 搜索冷却中，剩余 ${remainingSeconds} 秒`); //  !!!  区分日志：搜索冷却  !!!
		return true; // 处于搜索冷却中
	} else {
		return false; // 未冷却
	}
}

/**
 * 记录群组的最后搜索请求时间戳 (独立搜索冷却 - 用于 /search 命令)
 * @param {KVNamespace} botConfigKvNamespace
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function recordSearchGroupRequestTimestamp(botConfigKvNamespace, groupId) {
	//  !!!  函数名更明确：recordSearchGroupRequestTimestamp  !!!
	//  !!!  搜索冷却 Key  !!!
	const lastRequestTimestampKey = `cooldown:search:${groupId}`; //  !!!  搜索冷却专用 Key  !!!
	const now = Date.now();
	await putJsonToKv(botConfigKvNamespace, lastRequestTimestampKey, now);
	console.log(`群组 ${groupId} 搜索冷却已激活，最后搜索请求时间戳已更新`); //  !!!  区分日志：搜索冷却  !!!
}

/**
 * 解析持续时间字符串 (例如 "1.5m", "30s") 为毫秒
 * @param {string} durationString  持续时间字符串，例如 "1.5m", "30s", "1h"
 * @returns {number}  毫秒数
 */
export function parseDurationToMs(durationString) {
	const durationRegex = /^(\d+(\.\d+)?)([smh])$/; // 匹配数字 + (s/m/h) 格式
	const match = durationString.match(durationRegex);

	if (!match) {
		console.error(`无效的持续时间字符串: ${durationString}`);
		return 90000; // 默认 1.5 分钟 (90000 毫秒)，如果解析失败
	}

	const value = parseFloat(match[1]);
	const unit = match[3];

	switch (unit) {
		case 's':
			return value * 1000; // 秒
		case 'm':
			return value * 60 * 1000; // 分钟
		case 'h':
			return value * 60 * 60 * 1000; // 小时
		default:
			return 90000; // 默认 1.5 分钟 (90000 毫秒)，如果单位无法识别
	}
}
