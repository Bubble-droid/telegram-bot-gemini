// src/api/telegram-api.js

import { formatGeminiReply, formatGeminiReplyMarkdownV2 } from '../utils/formatter';

/**
 * 删除 Bot 命令菜单
 */
export async function deleteBotCommands(botToken, chatId) {
	const apiUrl = `https://api.telegram.org/bot${botToken}/deleteMyCommands`;
	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				scope: {
					type: 'chat',
					chat_id: chatId,
				},
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('删除 Bot 命令菜单失败:', error);
		} else {
			console.log('成功删除 Bot 命令菜单');
		}
	} catch (error) {
		console.error('删除 Bot 命令菜单时发生错误:', error);
	}
}

/**
 * 设置 Bot 命令菜单
 */
export async function setBotCommands(botToken, commands, chatId) {
	const apiUrl = `https://api.telegram.org/bot${botToken}/setMyCommands`;
	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				commands: commands,
				scope: {
					type: 'chat',
					chat_id: chatId,
				},
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('设置 Bot 命令菜单失败:', error);
		} else {
			console.log('成功设置 Bot 命令菜单');
		}
	} catch (error) {
		console.error('设置 Bot 命令菜单时发生错误:', error);
	}
}

/**
 * 设置 Bot 对话菜单按钮
 */
export async function setChatMenuButton(botToken, chatId) {
	const apiUrl = `https://api.telegram.org/bot${botToken}/setChatMenuButton`;
	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				menu_button: {
					type: 'commands',
				},
				chat_id: chatId,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('设置 Bot 对话菜单按钮失败:', error);
		} else {
			console.log('成功设置 Bot 对话菜单按钮');
		}
	} catch (error) {
		console.error('设置 Bot 对话菜单按钮时发生错误:', error);
	}
}

/**
 * 发送 Telegram 消息 (保持不变，但返回 response 对象) -  修改为返回 response 对象，以便获取 message_id
 * @param {string} botToken
 * @param {number} chatId
 * @param {string} text
 * @param {number} replyToMessageId  (optional) 如果需要回复某条消息，则指定 message_id
 * @param {string} parseMode  (optional) 消息解析模式，例如 'HTML'
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function sendTelegramMessage(botToken, chatId, text, replyToMessageId = null, parseMode = null) {
	//  !!!  修改返回值为 Promise<Response>  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
	const htmlText = formatGeminiReply(text);
	const payload = {
		chat_id: chatId,
		text: htmlText,
		reply_to_message_id: replyToMessageId,
		parse_mode: parseMode,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			//  !!!  错误处理：HTML 消息发送失败，尝试使用 MarkdownV2 重新发送  !!!
			console.error('发送 Telegram HTML 消息失败，尝试使用 MarkdownV2 格式重新发送');
			const markdownv2Text = formatGeminiReplyMarkdownV2(text); //  转换为 MarkdownV2 格式
			return await sendTelegramMessageMarkdownV2(botToken, chatId, markdownv2Text, replyToMessageId); //  使用 MarkdownV2 重新发送
		} else {
			const result = await response.json(); //  解析 JSON 响应
			console.log('成功发送 Telegram 消息 (HTML 格式), message_id:', result.result.message_id); //  打印 message_id (HTML 格式)
			return { ok: true, message_id: result.result.message_id }; //  返回包含 message_id 的对象
		}
	} catch (error) {
		console.error('发送 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 使用 MarkdownV2 格式发送 Telegram 消息 -  新增 sendTelegramMessageMarkdownV2 函数，用于错误处理时的备选方案
 * @param {string} botToken
 * @param {number} chatId
 * @param {string} text
 * @param {number} replyToMessageId  (optional) 如果需要回复某条消息，则指定 message_id
 * @returns {Promise<Response>}  返回 response 对象
 */
async function sendTelegramMessageMarkdownV2(botToken, chatId, text, replyToMessageId = null) {
	//  !!!  新增 sendTelegramMessageMarkdownV2 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text: text,
		reply_to_message_id: replyToMessageId,
		parse_mode: 'MarkdownV2', //  !!!  强制使用 MarkdownV2 解析模式  !!!
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('发送 Telegram MarkdownV2 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			const result = await response.json(); //  解析 JSON 响应
			console.log('成功发送 Telegram 消息 (MarkdownV2 格式), message_id:', result.result.message_id); //  打印 message_id (MarkdownV2 格式)
			return { ok: true, message_id: result.result.message_id }; //  返回包含 message_id 的对象
		}
	} catch (error) {
		console.error('发送 Telegram MarkdownV2 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 编辑 Telegram 消息 (用于流式响应) -  新增编辑消息函数
 * @param {string} botToken
 * @param {number} chatId
 * @param {number} messageId  要编辑的消息 ID
 * @param {string} text  新的消息文本
 * @param {string} parseMode  消息解析模式，例如 'HTML'
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function editTelegramMessage(botToken, chatId, messageId, text, parseMode) {
	//  !!!  新增 editTelegramMessage 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/editMessageText`;
	const payload = {
		chat_id: chatId,
		message_id: messageId,
		text: text,
		parse_mode: parseMode,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('编辑 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			// console.log('成功编辑 Telegram 消息, message_id:', messageId); //  打印 message_id
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error('编辑 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 删除 Telegram 消息 -  新增删除消息函数
 * @param {string} botToken
 * @param {number} chatId
 * @param {number} messageId  要删除的消息 ID
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function deleteTelegramMessage(botToken, chatId, messageId) {
	//  !!!  新增 deleteTelegramMessage 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/deleteMessage`;
	const payload = {
		chat_id: chatId,
		message_id: messageId,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('删除 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log('成功删除 Telegram 消息, message_id:', messageId); //  打印 message_id
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error('删除 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 转发 Telegram 消息 -  新增 forwardTelegramMessage 函数  !!!
 * @param {string} botToken
 * @param {number} chatId  目标 Chat ID (维护人员)
 * @param {number} fromChatId  原始消息来源 Chat ID (用户)
 * @param {number} messageId  要转发的消息 ID
 * @returns {Promise<Response>}  返回 response 对象
 */
export async function forwardTelegramMessage(botToken, chatId, fromChatId, messageId) {
	//  !!!  新增 forwardTelegramMessage 函数  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/forwardMessage`;
	const payload = {
		chat_id: chatId,
		from_chat_id: fromChatId,
		message_id: messageId,
	};

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('转发 Telegram 消息失败:', error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log(`成功转发 Telegram 消息 (message_id: ${messageId}) to chat_id: ${chatId}`); //  打印转发成功的日志
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error('转发 Telegram 消息时发生错误:', error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}
