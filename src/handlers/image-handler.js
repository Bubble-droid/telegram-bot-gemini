// src/handlers/image-handler.js

import { base64Encode } from '../utils/utils';

/**
 * 处理图片消息并获取消息内容 (用于普通消息和回复提问) -  合并函数，添加 isReply 参数
 * @param {object} message Telegram message 对象
 * @param {object} env Cloudflare Worker environment
 * @param {boolean} isReply  是否为回复提问场景，默认为 false
 * @returns {Promise<object>} messageContent 对象
 */
export async function handleImageMessageForContext(message, env, isReply = false) {
	console.log(`开始处理图片消息 (普通消息/回复提问, isReply: ${isReply})...`);
	const imageDataKv = env.IMAGE_DATA;
	const photoArray = message.photo;
	//  !!!  改进 largestPhoto 选择逻辑  !!!
	let largestPhoto;
	if (photoArray.length >= 3) {
		largestPhoto = photoArray[2]; //  优先选择索引为 2 的图片 (第三个尺寸)
		console.log(`图片尺寸数组长度 >= 3，选择索引为 2 的图片`);
	} else if (photoArray.length > 0) {
		//  !!!  添加判断，防止 photoArray 为空时报错
		largestPhoto = photoArray[photoArray.length - 1]; //  否则选择最后一个可用的图片尺寸
		console.log(`图片尺寸数组长度 < 3，选择最后一个可用的图片`);
	} else {
		console.warn('图片尺寸数组为空，无法获取图片'); //  添加警告日志
		return { role: 'user', content: [{ type: 'text', text: message.caption || '(图片消息) - 无可用图片尺寸' }] };
	}
	//  !!!  largestPhoto 选择逻辑结束  !!!
	const fileId = largestPhoto.file_id;
	console.log(`图片 file_id: ${fileId}`);

	try {
		const fileInfoResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${fileId}`);
		if (!fileInfoResponse.ok) {
			console.error(`获取图片文件信息失败 (普通消息/回复提问, isReply: ${isReply}):`, fileInfoResponse.status, fileInfoResponse.statusText);
			return { role: 'user', content: [{ type: 'text', text: message.caption || '(图片消息) - 获取文件信息失败' }] };
		}
		const fileInfoJson = await fileInfoResponse.json();
		if (!fileInfoJson.ok) {
			console.error(`获取图片文件信息失败 (API error, 普通消息/回复提问, isReply: ${isReply}):`, fileInfoJson);
			return { role: 'user', content: [{ type: 'text', text: message.caption || '(图片消息) - API 错误' }] };
		}
		const filePath = fileInfoJson.result.file_path;
		const fileDownloadUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`;
		console.log(`图片下载 URL: ${fileDownloadUrl}`);

		const imageFileResponse = await fetch(fileDownloadUrl);
		if (!imageFileResponse.ok) {
			console.error(`下载图片文件失败 (普通消息/回复提问, isReply: ${isReply}):`, imageFileResponse.status, imageFileResponse.statusText);
			return { role: 'user', content: [{ type: 'text', text: message.caption || '(图片消息) - 下载失败' }] };
		}
		const imageBuffer = await imageFileResponse.arrayBuffer();
		const base64Image = base64Encode(String.fromCharCode(...new Uint8Array(imageBuffer)));
		const base64ImageUrl = `data:image/jpeg;base64,${base64Image}`;

		//  !!!  获取 botName 并移除 caption 中的 @botName  !!!
		const botName = env.TELEGRAM_BOT_NAME;
		let processedCaption = message.caption || '';
		processedCaption = processedCaption.replace(new RegExp(`@${botName}`, 'gi'), '').trim(); //  !!!  使用 RegExp 忽略大小写  !!!

		if (!isReply) {
			const imageKvKey = `image_base64_${crypto.randomUUID()}`;
			await imageDataKv.put(imageKvKey, base64Image);
			console.log(`图片 Base64 数据已存储到 KV, key: ${imageKvKey} (普通消息)`);
			return {
				role: 'user',
				content: [
					{ type: 'text', text: processedCaption }, //  !!!  使用 processedCaption  !!!
					{
						type: 'image_url',
						image_url: { url: imageKvKey },
					},
				],
			};
		} else {
			console.log('回复提问场景，跳过图片数据 KV 存储');
			return {
				role: 'user',
				content: [
					{ type: 'text', text: processedCaption }, //  !!!  使用 processedCaption  !!!
					{
						type: 'image_url',
						image_url: { url: base64ImageUrl },
					},
				],
			};
		}
	} catch (error) {
		console.error(`处理图片消息失败 (普通消息/回复提问, isReply: ${isReply}):`, error);
		return { role: 'user', content: [{ type: 'text', text: message.caption || `(图片消息) - 处理错误: ${error.message}` }] };
	}
}
