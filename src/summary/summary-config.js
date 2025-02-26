// src/summary/summary-config.js

import { getJsonFromKv, putJsonToKv } from '../utils/utils';

/**
 * 获取总结白名单群组列表
 * @param {object} env Cloudflare Worker environment
 * @returns {Promise<Array<number>>} 白名单群组 ID 数组
 */
export async function getSummaryGroupWhitelist(env) {
	const summaryConfigKv = env.SUMMARY_CONFIG;
	const summaryGroupWhitelistKey = env.SUMMARY_GROUP_WHITELIST_KV_KEY;
	return (await getJsonFromKv(summaryConfigKv, summaryGroupWhitelistKey)) || [];
}

/**
 * 添加群组到总结白名单
 * @param {object} env Cloudflare Worker environment
 * @param {number} groupId 群组 ID
 * @returns {Promise<void>}
 */
export async function addSummaryGroupToWhitelist(env, groupId) {
	const summaryConfigKv = env.SUMMARY_CONFIG;
	const summaryGroupWhitelistKey = env.SUMMARY_GROUP_WHITELIST_KV_KEY;
	let whitelist = await getSummaryGroupWhitelist(env);
	if (!whitelist.includes(groupId)) {
		whitelist.push(groupId);
		await putJsonToKv(summaryConfigKv, summaryGroupWhitelistKey, whitelist);
		console.log(`群组 ${groupId} 已添加到总结白名单`);
	} else {
		console.log(`群组 ${groupId} 已在总结白名单中，无需重复添加`);
	}
}

/**
 * 从总结白名单移除群组
 * @param {object} env Cloudflare Worker environment
 * @param {number} groupId 群组 ID
 * @returns {Promise<void>}
 */
export async function removeSummaryGroupFromWhitelist(env, groupId) {
	const summaryConfigKv = env.SUMMARY_CONFIG;
	const summaryGroupWhitelistKey = env.SUMMARY_GROUP_WHITELIST_KV_KEY;
	let whitelist = await getSummaryGroupWhitelist(env);
	const index = whitelist.indexOf(groupId);
	if (index > -1) {
		whitelist.splice(index, 1);
		await putJsonToKv(summaryConfigKv, summaryGroupWhitelistKey, whitelist);
		console.log(`群组 ${groupId} 已从总结白名单移除`);
	} else {
		console.log(`群组 ${groupId} 不在总结白名单中，无法移除`);
	}
}

/**
 * 检查群组是否在总结白名单中
 * @param {object} env Cloudflare Worker environment
 * @param {number} groupId 群组 ID
 * @returns {Promise<boolean>}
 */
export async function isGroupInSummaryWhitelist(env, groupId) {
	// const summaryConfigKv = env.SUMMARY_CONFIG;
	// const summaryGroupWhitelistKey = env.SUMMARY_GROUP_WHITELIST_KV_KEY;
	const whitelist = await getSummaryGroupWhitelist(env);
	return whitelist.includes(groupId);
}

/**
 * 获取总结功能系统提示
 * @param {object} env Cloudflare Worker environment
 * @returns {Promise<string>} 系统提示文本
 */
export async function getSummarySystemPrompt(env) {
	const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
	const systemPromptKey = env.SUMMARY_SYSTEM_PROMPT_KV_KEY;
	return (await getJsonFromKv(systemInitConfigKv, systemPromptKey)) || 'You are a helpful assistant. Summarize the following chat history.';
}
