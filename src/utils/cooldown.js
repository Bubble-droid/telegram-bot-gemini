// src/utils/cooldown.js

import { getJsonFromKv, putJsonToKv } from '../utils';

/**
 * 检查群组是否处于冷却中
 * @param {KVNamespace} botConfigKvNamespace
 * @param {string} cooldownDuration  冷却时间，例如 "1.5m"
 * @param {number} groupId
 * @param {number} userId
 * @param {Array<number>} userWhitelist  用户白名单
 * @returns {Promise<boolean>}  true 表示处于冷却中，false 表示未冷却
 */
export async function isGroupInCooldown(botConfigKvNamespace, cooldownDuration, groupId, userId, userWhitelist) {
	if (userWhitelist && userWhitelist.includes(userId)) {
		console.log(`白名单用户 ${userId}，跳过冷却检查`);
		return false; // 白名单用户不受冷却限制
	}

	const lastRequestTimestampKey = `cooldown:${groupId}`;
	const lastRequestTimestamp = await getJsonFromKv(botConfigKvNamespace, lastRequestTimestampKey) || 0; // 默认值为 0

	const cooldownMs = parseDurationToMs(cooldownDuration); // 将冷却时间字符串转换为毫秒
	const now = Date.now();
	const elapsedMs = now - lastRequestTimestamp;

	if (elapsedMs < cooldownMs) {
		const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
		console.log(`群组 ${groupId} 冷却中，剩余 ${remainingSeconds} 秒`);
		return true; // 处于冷却中
	} else {
		return false; // 未冷却
	}
}

/**
 * 记录群组的最后请求时间戳，并更新冷却状态
 * @param {KVNamespace} botConfigKvNamespace
 * @param {number} groupId
 * @returns {Promise<void>}
 */
export async function recordGroupRequestTimestamp(botConfigKvNamespace, groupId) {
	const lastRequestTimestampKey = `cooldown:${groupId}`;
	const now = Date.now();
	await putJsonToKv(botConfigKvNamespace, lastRequestTimestampKey, now);
	console.log(`群组 ${groupId} 冷却已激活，最后请求时间戳已更新`);
}


/**
 * 解析持续时间字符串 (例如 "1.5m", "30s") 为毫秒
 * @param {string} durationString  持续时间字符串，例如 "1.5m", "30s", "1h"
 * @returns {number}  毫秒数
 */
function parseDurationToMs(durationString) {
	const durationRegex = /^(\d+(\.\d+)?)([smh])$/; // 匹配数字 + (s/m/h) 格式
	const match = durationString.match(durationRegex);

	if (!match) {
		console.error(`无效的持续时间字符串: ${durationString}`);
		return 90000; // 默认 1.5 分钟 (90000 毫秒)，如果解析失败
	}

	const value = parseFloat(match[1]);
	const unit = match[3];

	switch (unit) {
		case 's': return value * 1000;      // 秒
		case 'm': return value * 60 * 1000;   // 分钟
		case 'h': return value * 60 * 60 * 1000; // 小时
		default: return 90000; // 默认 1.5 分钟 (90000 毫秒)，如果单位无法识别
	}
}
