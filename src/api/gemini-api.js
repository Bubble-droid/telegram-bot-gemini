// src/api/gemini-api.js

/**
 * 调用 Gemini API 获取聊天回复 (HTTP 请求)
 * @param {Array<object>} messages  消息内容 (包含上下文历史)
 * @param {string} modelName Gemini 模型名称
 * @returns {Promise<string>}  返回 Gemini API 文本回复
 */
export async function getGeminiChatCompletion(env, messages, modelName) {
	const apiKey = env.GEMINI_API_KEY; //  从环境变量中获取 API Key
	const apiUrl = env.OPENAI_API_BASE_URL; //  从环境变量中获取 Base URL

	if (!apiKey || !apiUrl) {
		throw new Error('Gemini API Key 或 Base URL 未配置');
	}

	console.log('开始处理 API 请求 (HTTP)...');
	console.log(`当前使用的 AI 模型：${modelName}`);

	try {
		const payload = {
			model: modelName,
			messages: messages,
			max_completion_tokens: 8192,
			temperature: 0.7,
			n: 1,
		};

		// console.log('发送 Gemini API 请求 (完整 payload):', JSON.stringify(payload, null, 2)); //  打印完整 payload

		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`, //  使用 API Key
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			//  !!!  更详细的错误处理  !!!
			console.error('Gemini API 请求失败 (HTTP):', response.status, response.statusText);
			console.error('请求 URL:', apiUrl);
			console.error('请求 Headers:', response.headers); // 打印响应头
			try {
				const errorBody = await response.json();
				console.error('响应体 (JSON):', JSON.stringify(errorBody, null, 2)); // 尝试解析 JSON 错误体
			} catch (jsonError) {
				const errorText = await response.text();
				console.error('响应体 (Text):', errorText); //  如果 JSON 解析失败，打印文本错误体
			}
			throw new Error(`Gemini API 请求失败 (HTTP), 状态码: ${response.status}`); // 抛出错误，包含状态码
		}

		const responseData = await response.json();
		// console.log("Gemini API 响应 (HTTP):", JSON.stringify(responseData, null, 2)); // 打印完整响应数据

		const geminiReplyText = responseData.choices[0]?.message?.content; //  提取文本回复
		if (!geminiReplyText) {
			throw new Error('Gemini API 响应内容为空'); //  如果回复内容为空，抛出错误
		}

		return geminiReplyText; //  返回文本回复
	} catch (error) {
		console.error('调用 Gemini API 失败 (HTTP):', error);
		throw error; //  将错误抛出，让调用者处理
	}
}
