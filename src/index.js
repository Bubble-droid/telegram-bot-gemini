// src/index.js
import { getJsonFromKv, putJsonToKv, base64Encode, getUserWhitelist, isUserWhitelisted, addGroupToWhitelist, removeGroupFromWhitelist } from './utils';
import { initGeminiAPI, getGeminiChatCompletion } from './gemini';
import { handleBotCommand, botCommands } from './handlers/command-handler';
import { handleImageMessageForContext } from './handlers/image-handler';
import { getUserContextHistory, updateUserContextHistory } from './storage/context-storage';
import { isGroupInCooldown, recordGroupRequestTimestamp } from './utils/cooldown';
import { formatGeminiReply } from './utils/formatter';
import { handleSearchCommand } from './handlers/search-handler';


export default {
	async fetch(request, env) {
		await setBotCommands(env.BOT_TOKEN, botCommands);
		initGeminiAPI(
			env.GEMINI_API_KEY,
			env.OPENAI_API_BASE_URL,
			env.DEFAULT_GEMINI_MODEL_NAME
		);

		if (request.method === 'POST') {
			try {
				const update = await request.json();
				console.log("收到 Telegram Update:", update);

				if (!update.message) {
					console.log("Update 中不包含消息，忽略");
					return new Response('OK');
				}

				const message = update.message;

				if (message.chat.type === 'private') {
					console.log("收到私聊消息，忽略");
					return new Response('OK');
				}

				if (!message.text && !message.photo) {
					console.log("消息既不是文本也不是图片，忽略");
					return new Response('OK');
				}

				const groupId = message.chat.id;
				const botName = env.TELEGRAM_BOT_NAME; // 获取机器人名称

				//  检测是否 @bot 提问 (同时检查 text 和 caption)
				let isBotMention = false;

				const textToCheck = message.text || message.caption; // 优先检查 text, 没有 text 则检查 caption
				const entitiesToCheck = message.entities || message.caption_entities; // 优先检查 text 的 entities, 没有则检查 caption 的 entities


				if (textToCheck && entitiesToCheck) {
					isBotMention = entitiesToCheck.some(entity => {
						return entity.type === 'mention' && textToCheck.substring(entity.offset, entity.offset + entity.length) === `@${botName}`;
					});
				}

				if (isBotMention) {
					console.log(`检测到 @bot 提及 (可能为命令或提问)`);

					const botCommandPrefix = '/';
					const messageText = message.text || message.caption || '';
					const botNameMention = `@${botName}`; //  完整的 @botName 提及

					if (messageText.startsWith(botCommandPrefix) && messageText.includes(botNameMention)) {
						// Bot 命令处理
						const commandText = messageText.substring(messageText.indexOf(botCommandPrefix) + 1, messageText.indexOf(botNameMention)).trim().toLowerCase(); // 提取命令并转换为小写
						if (commandText === 'search') { //  !!!  新增 search 命令处理  !!!
							console.log("检测到 /search 命令，调用 handleSearchCommand 处理");
							return handleSearchCommand(message, env, botName, sendTelegramMessage, env.DEFAULT_GEMINI_MODEL_NAME); //  !!!  调用 handleSearchCommand  !!!
						} else {
							return handleBotCommand(message, env, botName, sendTelegramMessage, env.DEFAULT_GEMINI_MODEL_NAME, deleteTelegramMessage, env.TASK_QUEUE_KV); //  !!!  其他命令仍然由 handleBotCommand 处理 !!!
						}
					} else if (message.reply_to_message) { //  !!! 新增：回复消息的判断 !!!
						//  !!! 回复提问处理 (不带上下文) !!!
						console.log(`检测到回复提问 (不带上下文) - 流式响应处理`);
						return handleReplyToMessageQuestion(message, env, botName, sendTelegramMessage, editTelegramMessage, recordGroupRequestTimestamp, isGroupInCooldown, getUserWhitelist, getJsonFromKv, getUserContextHistory, updateUserContextHistory, getGeminiChatCompletion, formatGeminiReply, getJsonFromKv, putJsonToKv); //  !!! 调用新的处理函数 !!!
					}
					else {
						// @bot 提问处理 (流式响应，带上下文)
						console.log(`检测到 @bot 提问 (图片消息: ${!!message.photo}) -  流式响应处理 (带上下文)`);

						const groupId = message.chat.id;
						const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
						const botConfigKv = env.BOT_CONFIG;
						const groupWhitelist = await getJsonFromKv(botConfigKv, groupWhitelistKey) || [];
						if (!groupWhitelist.includes(groupId)) {
							console.log(`群组 ${groupId} 不在白名单中，忽略 @bot 提问`);
							return new Response('OK');
						}
						console.log(`群组 ${groupId} 在白名单中，继续处理 @bot 提问`);

						const userId = message.from.id;
						const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
						const userWhitelist = await getUserWhitelist(botConfigKv, userWhitelistKey) || [];
						const cooldownDuration = env.COOLDOWN_DURATION;
						const isInCooldown = await isGroupInCooldown(botConfigKv, cooldownDuration, groupId, userId, userWhitelist);
						if (isInCooldown) {
							console.log(`群组 ${groupId} 处于冷却中，忽略 @bot 提问`);
							return new Response('OK');
						}
						console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理 @bot 提问`);


						let messageContent;

						if (message.text) {
							const textWithoutBotName = message.text.replace(`@${botName}`, '').trim();
							messageContent = { role: 'user', content: textWithoutBotName };
						} else if (message.photo) {
							messageContent = await handleImageMessageForContext(message, env);
						}


						if (!messageContent) {
							console.warn("messageContent 为空，忽略 @bot 提问");
							return new Response('OK');
						}

						const contextKv = env.CONTEXT;
						const modelName = env.DEFAULT_GEMINI_MODEL_NAME;
						const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
						const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
						const imageDataKv = env.IMAGE_DATA;

						const contextHistory = await getUserContextHistory(contextKv, groupId, userId);
						console.log("上下文历史记录 (提问前):", contextHistory);

						const systemInitMessages = await getJsonFromKv(systemInitConfigKv, systemPromptKey) || [];
						console.log("系统初始化消息:", systemInitMessages);


						let processedMessages = [];
						for (const msg of [...contextHistory, messageContent]) {
							if (msg.content && Array.isArray(msg.content)) {
								const processedContent = await Promise.all(msg.content.map(async contentPart => {
									if (contentPart.type === 'image_url') {
										const imageKvKey = contentPart.image_url.url;
										const base64Image = await imageDataKv.get(imageKvKey);
										if (base64Image) {
											return {
												type: 'image_url',
												image_url: { url: `data:image/jpeg;base64,${base64Image}` }
											};
										} else {
											console.error(`KV 键名 ${imageKvKey} 对应的 Base64 数据未找到`);
											return { type: 'text', text: `(图片数据丢失, key: ${imageKvKey})` };
										}
									}
									return contentPart;
								}));
								processedMessages.push({ role: msg.role, content: processedContent });
							} else {
								processedMessages.push(msg);
							}
						}

						const geminiMessages = [
							...systemInitMessages,
							...processedMessages,
						];
						// console.log("发送给 Gemini API 的消息 (流式):", JSON.stringify(geminiMessages, null, 2)); //  修改日志

						let geminiStream; //  声明 geminiStream 变量
						try {
							geminiStream = await getGeminiChatCompletion(geminiMessages, modelName);
							// console.log("Gemini API 流式响应:", geminiStream); //  !!!  不要打印 stream 对象，会输出大量信息  !!!


							let accumulatedReplyText = ''; //  用于累积 Gemini API 回复文本
							let telegramMessageId = null; //  用于存储第一条 Telegram 消息的 message_id，后续编辑消息

							//  !!!  逐 chunk 处理 Gemini API 流式响应  !!!
							for await (const chunk of geminiStream) {
								const chunkText = chunk.choices[0]?.delta?.content || ''; //  获取 chunk 文本内容
								if (chunkText) {
									accumulatedReplyText += chunkText; //  累积文本

									const formattedChunkText = formatGeminiReply(chunkText); //  格式化 chunk 文本

									if (!telegramMessageId) {
										//  发送第一条消息，并获取 message_id
										const firstResponse = await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedChunkText, message.message_id, 'HTML'); //  发送格式化后的 chunk 文本,  并指定 parse_mode 为 HTML
										telegramMessageId = firstResponse?.message_id; //  获取 message_id
										console.log("发送第一条流式消息，message_id:", telegramMessageId); //  打印 message_id
									} else {
										//  编辑已发送的消息，追加新的 chunk 文本
										const editResult = await editTelegramMessage(env.BOT_TOKEN, groupId, telegramMessageId, formatGeminiReply(accumulatedReplyText), 'HTML'); //  编辑消息，追加累积的文本
										if (!editResult.ok) {
											console.error("编辑 Telegram 消息失败:", editResult); //  记录编辑消息失败的错误
											if (editResult.error && editResult.error.error_code === 429) { //  !!!  检测到 429 错误  !!!
												console.warn("遇到 429 错误，达到速率限制，请稍后重试"); //  添加警告日志
												//  !!!  可以考虑延时重试，但这里为了简化，先只记录错误  !!!
											}
											//  !!!  如果编辑失败，降级为发送新消息 (可选)  !!!
											// await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedChunkText, null, 'HTML');
										} else {
											console.log("编辑 Telegram 消息成功，message_id:", telegramMessageId); //  打印编辑消息成功的日志
										}
									}

									await new Promise(resolve => setTimeout(resolve, 1000)); //  !!!  延时 500 毫秒 !!!
								}
							} //  !!!  for await 循环 结束 !!!


							// console.log("Gemini API 流式响应处理完成，完整回复文本 (原始):", accumulatedReplyText); //  打印完整回复 (原始)
							// console.log("Gemini API 流式响应处理完成，完整回复文本 (HTML 格式化后):", formatGeminiReply(accumulatedReplyText));


							//  !!!  恢复为两次调用 updateUserContextHistory，分别记录 userMessage 和 botReply  !!!
							await updateUserContextHistory(contextKv, imageDataKv, groupId, userId, messageContent); //  记录用户消息
							const botReplyMessageContent = { role: 'assistant', content: accumulatedReplyText }; //  机器人回复消息内容
							await updateUserContextHistory(contextKv, env.IMAGE_DATA, groupId, userId, botReplyMessageContent); //  记录机器人回复消息
							console.log("上下文历史记录 (提问后):", await getUserContextHistory(contextKv, groupId, userId));

							await recordGroupRequestTimestamp(botConfigKv, groupId);


						} catch (error) {
							console.error("调用 Gemini API 失败 (流式传输):", error);
							geminiReplyText = "🤖️ Gemini API 接口调用失败，请稍后再试 (流式传输)"; //  修改错误提示信息，提示流式传输
							await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML'); //  发送错误消息
						}


					} //  !!!  @bot 提问处理 (流式响应)  的  else  代码块 结束 !!!


				} else {
					// !!!  普通群组消息处理 (非 @bot 提及)  !!!
					console.log(`普通群组消息 (图片消息: ${!!message.photo})`);

					const groupId = message.chat.id;
					const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
					const botConfigKv = env.BOT_CONFIG;
					const groupWhitelist = await getJsonFromKv(botConfigKv, groupWhitelistKey) || [];
					if (!groupWhitelist.includes(groupId)) {
						console.log(`群组 ${groupId} 不在白名单中，忽略普通消息`);
						return new Response('OK');
					}
					console.log(`群组 ${groupId} 在白名单中，继续处理普通消息并记录上下文`);

					const contextKv = env.CONTEXT;
					const userId = message.from.id;

					let messageContent;

					if (message.text) {
						const textWithoutBotName = message.text.replace(`@${botName}`, '').trim();
						messageContent = { role: 'user', content: textWithoutBotName };
					} else if (message.photo) {
						messageContent = await handleImageMessageForContext(message, env);
					}


					if (messageContent) {

						let processedMessageContent = { ...messageContent };
						if (processedMessageContent.content && Array.isArray(processedMessageContent.content)) {
							processedMessageContent.content = await Promise.all(processedMessageContent.content.map(async contentPart => {
								if (contentPart.type === 'image_url') {
									const imageKvKey = contentPart.image_url.url;
									const base64Image = await env.IMAGE_DATA.get(imageKvKey);
									if (base64Image) {
										return {
											type: 'image_url',
											image_url: { url: `data:image/jpeg;base64,${base64Image}` }
										};
									} else {
										console.error(`KV 键名 ${imageKvKey} 对应的 Base64 数据未找到`);
										return { type: 'text', text: `(图片数据丢失, key: ${imageKvKey})` };
									}
								}
								return contentPart;
							}));
						}


						await updateUserContextHistory(contextKv, env.IMAGE_DATA, groupId, userId, messageContent);
						console.log(`已更新用户 ${userId} 在群组 ${groupId} 的上下文`);
					} else {
						console.log(`非文本或图片消息，不记录上下文`);
					}
				}

				return new Response('OK');

			} catch (error) {
				console.error("解析 JSON 数据失败:", error);
				return new Response('Bad Request', { status: 400 });
			}
		} else {
			return new Response('Method Not Allowed', { status: 405 });
		}
	},
};


/**
 * 设置 Bot 命令菜单 (保持不变)
 */
async function setBotCommands(botToken, commands) {
	const apiUrl = `https://api.telegram.org/bot${botToken}/setMyCommands`;
	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ commands: commands }),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error("设置 Bot 命令菜单失败:", error);
		} else {
			console.log("成功设置 Bot 命令菜单");
		}
	} catch (error) {
		console.error("设置 Bot 命令菜单时发生错误:", error);
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
async function sendTelegramMessage(botToken, chatId, text, replyToMessageId = null, parseMode = null) { //  !!!  修改返回值为 Promise<Response>  !!!
	const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text: text,
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
			const error = await response.json();
			console.error("发送 Telegram 消息失败:", error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			const result = await response.json(); //  解析 JSON 响应
			console.log("成功发送 Telegram 消息, message_id:", result.result.message_id); //  打印 message_id
			return { ok: true, message_id: result.result.message_id }; //  返回包含 message_id 的对象
		}
	} catch (error) {
		console.error("发送 Telegram 消息时发生错误:", error);
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
async function editTelegramMessage(botToken, chatId, messageId, text, parseMode) { //  !!!  新增 editTelegramMessage 函数  !!!
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
			console.error("编辑 Telegram 消息失败:", error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log("成功编辑 Telegram 消息, message_id:", messageId); //  打印 message_id
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error("编辑 Telegram 消息时发生错误:", error);
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
async function deleteTelegramMessage(botToken, chatId, messageId) { //  !!!  新增 deleteTelegramMessage 函数  !!!
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
			console.error("删除 Telegram 消息失败:", error);
			return { ok: false, error }; //  返回包含错误信息的对象
		} else {
			console.log("成功删除 Telegram 消息, message_id:", messageId); //  打印 message_id
			return { ok: true }; //  返回成功对象
		}
	} catch (error) {
		console.error("删除 Telegram 消息时发生错误:", error);
		return { ok: false, error }; //  返回包含错误信息的对象
	}
}

/**
 * 处理回复消息的提问 (不带上下文)
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage 发送 Telegram 消息的函数
 * @param {function} editTelegramMessage 编辑 Telegram 消息的函数
 * @param {function} recordGroupRequestTimestamp 记录群组请求时间戳函数
 * @param {function} isGroupInCooldown 检查群组冷却函数
 * @param {function} getUserWhitelist 获取用户白名单函数
 * @param {function} getJsonFromKv 从 KV 获取 JSON 数据函数
 * @param {function} getUserContextHistory 获取用户上下文历史函数 (这里实际上不使用，但为了参数统一保留)
 * @param {function} updateUserContextHistory 更新用户上下文历史函数 (这里实际上不使用，但为了参数统一保留)
 * @param {function} getGeminiChatCompletion 调用 Gemini API 函数
 * @param {function} formatGeminiReply 格式化 Gemini 回复函数
 * @param {function} getJsonFromKv KV 读取 JSON 函数 (重复参数，但为了参数统一保留)
 * @param {function} putJsonToKv KV 写入 JSON 函数 (重复参数，但为了参数统一保留)
 * @returns {Promise<Response>}
 */
async function handleReplyToMessageQuestion(message, env, botName, sendTelegramMessage, editTelegramMessage, recordGroupRequestTimestamp, isGroupInCooldown, getUserWhitelist, getJsonFromKv, getUserContextHistory, updateUserContextHistory, getGeminiChatCompletion, formatGeminiReply, getJsonFromKv_duplicate, putJsonToKv_duplicate) {
	console.log("开始处理回复消息提问 (不带上下文)...");

	const groupId = message.chat.id;
	const groupWhitelistKey = env.GROUP_WHITELIST_KV_KEY;
	const botConfigKv = env.BOT_CONFIG;
	const groupWhitelist = await getJsonFromKv(botConfigKv, groupWhitelistKey) || [];
	if (!groupWhitelist.includes(groupId)) {
		console.log(`群组 ${groupId} 不在白名单中，忽略回复提问`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 在白名单中，继续处理回复提问`);

	const userId = message.from.id;
	const userWhitelistKey = env.USER_WHITELIST_KV_KEY;
	const userWhitelist = await getUserWhitelist(botConfigKv, userWhitelistKey) || [];
	const cooldownDuration = env.COOLDOWN_DURATION;
	const isInCooldown = await isGroupInCooldown(botConfigKv, cooldownDuration, groupId, userId, userWhitelist);
	if (isInCooldown) {
		console.log(`群组 ${groupId} 处于冷却中，忽略回复提问`);
		return new Response('OK');
	}
	console.log(`群组 ${groupId} 未冷却或用户在白名单中，继续处理回复提问`);

	const systemInitConfigKv = env.SYSTEM_INIT_CONFIG;
	const systemPromptKey = env.SYSTEM_PROMPT_KV_KEY;
	const systemInitMessages = await getJsonFromKv(systemInitConfigKv, systemPromptKey) || [];
	console.log("系统初始化消息 (回复提问):", systemInitMessages);

	const imageDataKv = env.IMAGE_DATA;
	const modelName = env.DEFAULT_GEMINI_MODEL_NAME;

	const replyToMessage = message.reply_to_message;
	const replyMessage = message;

	let replyToMessageContent = await extractMessageContentForReply(replyToMessage, env, botName); //  !!!  提取被回复消息内容
	let currentMessageContent = await extractMessageContentForReply(replyMessage, env, botName); //  !!!  提取当前回复消息内容，包含 @bot 的文本/图片

	let geminiMessages = [...systemInitMessages]; //  !!!  仅包含系统初始化消息，不包含上下文 !!!

	if (replyToMessageContent) {
		geminiMessages.push(replyToMessageContent); //  添加被回复消息内容
	}
	if (currentMessageContent) {
		geminiMessages.push(currentMessageContent); //  添加当前回复消息内容
	}

	// console.log("发送给 Gemini API 的消息 (回复提问, 流式):", JSON.stringify(geminiMessages, null, 2));

	let geminiStream;
	let geminiReplyText = '';
	try {
		geminiStream = await getGeminiChatCompletion(geminiMessages, modelName);

		let accumulatedReplyText = '';
		let telegramMessageId = null;

		for await (const chunk of geminiStream) {
			const chunkText = chunk.choices[0]?.delta?.content || '';
			if (chunkText) {
				accumulatedReplyText += chunkText;
				const formattedChunkText = formatGeminiReply(chunkText);

				if (!telegramMessageId) {
					const firstResponse = await sendTelegramMessage(env.BOT_TOKEN, groupId, formattedChunkText, message.message_id, 'HTML');
					telegramMessageId = firstResponse?.message_id;
					console.log("发送第一条流式消息 (回复提问)，message_id:", telegramMessageId);
				} else {
					const editResult = await editTelegramMessage(env.BOT_TOKEN, groupId, telegramMessageId, formatGeminiReply(accumulatedReplyText), 'HTML');
					if (!editResult.ok) {
						console.error("编辑 Telegram 消息失败 (回复提问):", editResult);
					} else {
						console.log("编辑 Telegram 消息成功 (回复提问)，message_id:", telegramMessageId);
					}
				}
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}

		await recordGroupRequestTimestamp(botConfigKv, groupId); //  记录冷却时间

	} catch (error) {
		console.error("调用 Gemini API 失败 (回复提问, 流式):", error);
		geminiReplyText = "🤖️ Gemini API 接口调用失败，请稍后再试 (回复提问, 流式)";
		await sendTelegramMessage(env.BOT_TOKEN, groupId, geminiReplyText, message.message_id, 'HTML');
	}

	return new Response('OK');
}

/**
 * 提取消息内容 (文本和/或图片) 用于回复提问 -  彻底重构函数
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @returns {Promise<object|null>}  messageContent 对象，如果消息不包含文本或图片则返回 null
 */
async function extractMessageContentForReply(message, env, botName) { //  !!!  彻底重构  !!!
	if (!message) {
		return null;
	}

	const botNameMention = `@${botName}`;
	let messageContentParts = []; //  用于存储消息内容片段 (text 或 image_url)

	// 处理文本内容 (text 或 caption)
	let text = message.text || message.caption;
	if (text) {
		text = text.replace(botNameMention, '').trim(); // 移除 @botName 并 trim
		if (text) { //  只有当文本内容不为空时才添加 text content part
			messageContentParts.push({ type: 'text', text: text });
		}
	}

	// 处理图片内容 (photo)
	if (message.photo) {
		const imageMessageContent = await handleImageMessageForContext(message, env, true); //  !!!  isReply = true  !!!
		if (imageMessageContent && imageMessageContent.content) {
			messageContentParts.push(...imageMessageContent.content.filter(part => part.type === 'image_url')); //  只添加 image_url content part, 并过滤掉可能的 text
		}
	}

	if (messageContentParts.length === 0) {
		return null; //  如果没有任何内容片段，则返回 null
	} else if (messageContentParts.length === 1 && messageContentParts[0].type === 'text') {
		return { role: 'user', content: messageContentParts[0].text }; //  如果只有一个 text content part, 则 content 为字符串
	} else {
		return { role: 'user', content: messageContentParts }; //  否则 content 为 content part 数组
	}
}
