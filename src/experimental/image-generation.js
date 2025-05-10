// src/experimental/image-generation.js
import { base64Encode } from '../utils/utils';
import { sendTelegramPhoto } from '../api/telegram-api';

/**
 * 处理 /exp_img 命令 (实验性图片生成)
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {string} botName 机器人名称
 * @param {function} sendTelegramMessage  发送 Telegram 消息的函数
 * @param {function} deleteTelegramMessage  删除 Telegram 消息的函数
 * @returns {Promise<Response>}
 */
export async function handleImageGeneration(
	env,
	message,
	userId,
	chatId,
	replyToMessageId,
	botToken,
	botName,
	botConfigKv,
	isGroupInCooldown,
	userWhitelistKey,
	cooldownDuration,
	sendTelegramMessage,
	deleteTelegramMessage,
	recordGroupRequestTimestamp,
) {
	console.log(`开始处理图片生成...`);

	const isInCooldown = await isGroupInCooldown(
		botConfigKv,
		cooldownDuration,
		chatId,
		userId,
		userWhitelistKey,
		sendTelegramMessage,
		replyToMessageId,
		botToken,
	);
	if (isInCooldown) {
		return new Response('OK');
	} else {
		console.log(`群组 ${chatId} 未冷却或用户在白名单中，继续处理图片生成`);
	}

	const tempRelyText = `**开始绘图...**`;
	const tempMessage = await sendTelegramMessage(botToken, chatId, tempRelyText, replyToMessageId, 'HTML');
	const tempMessageId = tempMessage?.message_id;

	const geminiApiKey = env.GEMINI_API_KEY;
	const geminiApiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`; //  !!!  使用正确的模型 endpoint !!!

	const commandPrefix = `/exp_img@${botName}`; //  !!!  定义命令前缀，方便后续处理 !!!
	//  !!!  提取用户提问内容，并移除命令前缀 (更严谨的方式)  !!!
	let userPromptText = message.caption || message.text || '';
	const commandRegex = new RegExp(`^${commandPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi'); //  !!!  构建正则表达式，忽略大小写，并转义特殊字符 !!!
	userPromptText = userPromptText.replace(commandRegex, '').trim(); //  !!!  使用 replace 和正则表达式移除命令前缀 !!!

	//  !!!  处理用户上传的图片 (如果有)  !!!
	let base64ImageData = null;
	let isImageEditMode = false;
	if (message.photo && message.photo.length > 0) {
		console.log('开始在 handleImageGeneration 函数内处理图片数据...');
		isImageEditMode = true; //  !!!  检测到用户上传图片，进入图片编辑模式  !!!
		const photoArray = message.photo;
		let largestPhoto;
		if (photoArray.length >= 3) {
			largestPhoto = photoArray[2]; //  优先选择索引为 2 的图片 (第三个尺寸)
			console.log(`图片尺寸数组长度 >= 3，选择索引为 2 的图片`);
		} else if (photoArray.length > 0) {
			largestPhoto = photoArray[photoArray.length - 1]; //  否则选择最后一个可用的图片尺寸
			console.log(`图片尺寸数组长度 < 3，选择最后一个可用的图片`);
		} else {
			console.warn('图片尺寸数组为空，无法获取图片');
			await sendTelegramMessage(botToken, chatId, '😥 图片处理失败，请重试。', replyToMessageId, 'HTML');
			return new Response('OK');
		}
		const fileId = largestPhoto.file_id;
		console.log(`图片 file_id: ${fileId}`);

		try {
			const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
			const fileInfoJson = await fileInfoResponse.json();
			const filePath = fileInfoJson.result.file_path;
			const fileDownloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
			console.log(`图片下载 URL: ${fileDownloadUrl}`);

			const imageFileResponse = await fetch(fileDownloadUrl);
			if (!imageFileResponse.ok) {
				console.error(`下载图片文件失败:`, imageFileResponse.status, imageFileResponse.statusText);
				await sendTelegramMessage(botToken, chatId, '😥 图片下载失败，请重试。', replyToMessageId, 'HTML');
				return new Response('OK');
			}
			const imageBuffer = await imageFileResponse.arrayBuffer();
			base64ImageData = base64Encode(imageBuffer); //  !!!  直接在函数内进行 Base64 编码  !!!
			console.log('成功获取用户上传图片并进行 Base64 编码 (在 handleImageGeneration 函数内)');
		} catch (imageProcessError) {
			console.error('在 handleImageGeneration 函数内处理图片数据失败:', imageProcessError);
			await sendTelegramMessage(botToken, chatId, `😥 图片处理失败: ${imageProcessError.message}`, replyToMessageId, 'HTML');
			return new Response('OK');
		}
	}

	let apiRequestBody = {}; //  !!!  声明 apiRequestBody 变量 !!!
	if (isImageEditMode) {
		//  !!!  图片编辑模式：请求体包含 text 和 inlineData  !!!
		console.log('进入图片编辑模式，构建 Gemini API 请求体 (包含图片)...');

		apiRequestBody = {
			contents: [
				{
					parts: [
						{ text: userPromptText },
						base64ImageData ? { inlineData: { mime_type: 'image/jpeg', data: base64ImageData } } : {}, //  !!!  只有当有图片数据时才添加 inlineData  !!!
					],
				},
			],
			generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }, //  !!!  明确指定期望 Image 响应  !!!
		};
	} else {
		//  !!!  图片生成模式：请求体仅包含 text  !!!
		console.log('进入图片生成模式，构建 Gemini API 请求体 (仅文本)...');

		apiRequestBody = {
			contents: [{ parts: [{ text: userPromptText }] }], //  !!!  仅包含 text part !!!
			generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }, //  !!!  明确指定期望 Image 响应  !!!
		};
	}

	console.log('发送给 Gemini API 的绘图提示文本:', userPromptText);
	// console.log(`API URL：${geminiApiEndpoint}`);
	console.log(`请求体：${JSON.stringify(apiRequestBody, null, 2)}`);

	try {
		const apiResponse = await fetch(geminiApiEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(apiRequestBody),
		});
		const apiResponseJson = await apiResponse.json();
		// console.log('Gemini 图片生成 API 响应:', JSON.stringify(apiResponseJson, null, 2));

		let generatedImageBase64 = null;
		let responseText = ''; //  !!!  用于存储 API 响应中的文本内容 !!!

		if (apiResponseJson.candidates && apiResponseJson.candidates[0].content.parts) {
			const parts = apiResponseJson.candidates[0].content.parts;
			for (const part of parts) {
				if (part.inlineData) {
					//  !!!  优先提取 inlineData (图片数据)  !!!
					generatedImageBase64 = part.inlineData.data;
				} else if (part.text) {
					//  !!!  累加 text 内容，作为回复消息的 caption  !!!
					responseText += part.text.trim() + '\n';
				}
			}
		}

		await deleteTelegramMessage(botToken, chatId, tempMessageId);

		if (generatedImageBase64) {
			//  !!!  成功获取图片数据  !!!
			if (responseText) {
				//  !!!  如果存在 text 内容，则将其作为 caption 发送  !!!
				await sendTelegramPhoto(botToken, chatId, generatedImageBase64, replyToMessageId, responseText.trim()); //  !!!  发送图片和 caption !!!
			} else {
				//  !!!  否则，仅发送图片  !!!
				await sendTelegramPhoto(botToken, chatId, generatedImageBase64, replyToMessageId); //  !!!  调用 sendTelegramPhoto 发送图片 !!!
			}
		} else {
			console.warn('Gemini 图片生成 API 响应中未找到图片数据');
			//  !!!  发送错误提示，并包含 API 响应中的 text 内容 (如果存在) !!!
			await sendTelegramMessage(
				botToken,
				chatId,
				'😥 Gemini API 未返回图片数据。' + (responseText ? `\n\nAPI 返回文本:\n${responseText.trim()}` : ''),
				replyToMessageId,
				'HTML',
			);
		}

		await recordGroupRequestTimestamp(botConfigKv, chatId);
	} catch (error) {
		console.error('调用 Gemini 图片生成 API 失败:', error);
		await sendTelegramMessage(botToken, chatId, `😥 图片生成失败: ${error.message}`, replyToMessageId, 'HTML');
	}

	return new Response('OK');
}
