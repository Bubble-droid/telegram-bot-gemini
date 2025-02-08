// src/formatter.js

/**
 * 格式化 Gemini 回复文本为 Telegram HTML 格式
 *  -  参考 helpers.ts.txt 中的 formatHtml 函数
 * @param {string} text  Gemini 回复的原始文本
 * @returns {string}  格式化后的 HTML 文本
 */
export function formatGeminiReply(text) {
	if (!text) return '';

	let formattedText = text;

	// HTML 字符转义
	formattedText = escapeHtml(formattedText);

	// 代码块格式化 (使用 <pre><code> 标签)
	formattedText = formattedText.replace(/```(\w*)\n([\s\S]+?)```/g, (_, lang, code) => {
		const languageClass = lang ? `language-${lang}` : ''; //  添加 language class，如果指定了语言
		return `<pre><code class="${languageClass}">${escapeHtml(code.trim())}</code></pre>`; //  使用 escapeHtml 转义代码块内容
	});

	// 加粗格式化 (使用 <b> 标签)
	formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

	// 斜体格式化 (使用 <i> 标签)
	formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>');

	// 行内代码格式化 (使用 <code> 标签)
	formattedText = formattedText.replace(/`(.*?)`/g, '<code>$1</code>');

	// 链接格式化 (使用 <a> 标签)
	formattedText = formattedText.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

	return formattedText.trim();
}


/**
 * HTML 字符转义
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
	return text
	.replace(/&/g, '&')
	.replace(/</g, '<')
	.replace(/>/g, '>')
	.replace(/"/g, '"')
	.replace(/'/g, '&#x27;'); //  单引号也进行转义，更严谨
}
