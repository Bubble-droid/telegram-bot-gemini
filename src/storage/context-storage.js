// src/storage/context-storage.js

import { getJsonFromKv, putJsonToKv } from '../utils/utils'; //  只导入需要的通用 KV 函数

/**
 * 获取用户在群组中的上下文历史
 * @param {KVNamespace} contextKvNamespace
 * @param {number} groupId
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
export async function getUserContextHistory(contextKvNamespace, groupId, userId) {
	const key = `context:${groupId}:${userId}`;
	return (await getJsonFromKv(contextKvNamespace, key)) || []; // 默认返回空数组
}

/**
 * 更新用户在群组中的上下文历史 -  恢复为接收 messageContent 参数
 * @param {KVNamespace} contextKvNamespace
 * @param {KVNamespace} imageDataKvNamespace
 * @param {number} groupId
 * @param {number} userId
 * @param {object} messageContent  新的消息内容 (例如 { role: 'user', content: '...' }) -  恢复为 messageContent
 * @param {number} maxHistoryLength  最大历史记录条数
 * @returns {Promise<void>}
 */
export async function updateUserContextHistory(
	contextKvNamespace,
	imageDataKvNamespace,
	groupId,
	userId,
	messageContent,
	maxHistoryLength = 10,
) {
	//  !!!  恢复为 messageContent 参数  !!!
	const key = `context:${groupId}:${userId}`;
	const previousHistory = await getUserContextHistory(contextKvNamespace, groupId, userId);
	let history = [...previousHistory];

	history.push(messageContent); //  直接 push messageContent

	if (history.length > maxHistoryLength) {
		history.shift();
	}

	await putJsonToKv(contextKvNamespace, key, history);

	await cleanupOrphanedImageData(imageDataKvNamespace, groupId, userId, history, previousHistory);
}

/**
 * 清理孤立的图片数据 (Base64 编码) -  恢复为处理标准消息对象数组
 * @param {KVNamespace} imageDataKvNamespace
 * @param {number} groupId
 * @param {number} userId
 * @param {Array<object>} currentContextHistory 当前上下文历史记录 (消息对象数组)
 * @param {Array<object>} previousContextHistory  之前的上下文历史记录 (消息对象数组)
 * @returns {Promise<void>}
 */
async function cleanupOrphanedImageData(imageDataKvNamespace, groupId, userId, currentContextHistory, previousContextHistory) {
	console.log(`开始清理用户 ${userId} 在群组 ${groupId} 中的孤立图片数据...`);

	const currentImageKeys = new Set();
	//  !!!  恢复为遍历消息对象数组，直接从 message 中提取图片 KV 键名  !!!
	for (const message of currentContextHistory) {
		//  直接遍历消息对象数组
		if (message.content && Array.isArray(message.content)) {
			for (const contentPart of message.content) {
				if (contentPart.type === 'image_url' && contentPart.image_url.url) {
					const imageUrl = contentPart.image_url.url;
					if (typeof imageUrl === 'string' && imageUrl.startsWith('image_base64_')) {
						currentImageKeys.add(imageUrl);
					}
				}
			}
		}
	}
	console.log('当前上下文历史中使用的图片 KV 键:', currentImageKeys);

	const previousImageKeys = new Set();
	if (previousContextHistory && Array.isArray(previousContextHistory)) {
		//  !!!  恢复为遍历消息对象数组，直接从 message 中提取图片 KV 键名  !!!
		for (const message of previousContextHistory) {
			//  直接遍历消息对象数组
			if (message.content && Array.isArray(message.content)) {
				for (const contentPart of message.content) {
					if (contentPart.type === 'image_url' && contentPart.image_url.url) {
						const imageUrl = contentPart.image_url.url;
						if (typeof imageUrl === 'string' && imageUrl.startsWith('image_base64_')) {
							previousImageKeys.add(imageUrl);
						}
					}
				}
			}
		}
	}
	console.log('之前的上下文历史中使用的图片 KV 键:', previousImageKeys);

	const orphanedImageKeys = new Set();
	for (const key of previousImageKeys) {
		if (!currentImageKeys.has(key)) {
			orphanedImageKeys.add(key);
		}
	}
	console.log('需要清理的孤立图片 KV 键:', orphanedImageKeys);

	if (orphanedImageKeys.size > 0) {
		console.log(`开始删除 ${orphanedImageKeys.size} 个孤立图片 KV 键...`);
		for (const key of orphanedImageKeys) {
			try {
				await imageDataKvNamespace.delete(key);
				console.log(`已删除孤立图片 KV 键: ${key}`);
			} catch (error) {
				console.error(`删除孤立图片 KV 键 ${key} 失败:`, error);
			}
		}
		console.log('孤立图片数据清理完成');
	} else {
		console.log('没有需要清理的孤立图片数据');
	}
}

/**
 * 清空用户在群组中的上下文历史 (可选，如果需要)
 * @param {KVNamespace} contextKvNamespace
 * @param {number} groupId
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function clearUserContextHistory(contextKvNamespace, groupId, userId) {
	const key = `context:${groupId}:${userId}`;
	await putJsonToKv(contextKvNamespace, key, []); // 存储空数组，清空历史记录
	console.log(`用户 ${userId} 在群组 ${groupId} 的上下文已清理...`);
}
