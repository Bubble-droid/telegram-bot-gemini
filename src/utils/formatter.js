// src/formatter.js

/**
 * HTML 字符转义 -  精简版本，仅转义 Telegram HTML 必需字符
 * @param {string} text  要转义的文本
 * @returns {string}  转义后的 HTML 文本
 */
export function escapeHtml(text) {
	if (!text) return '';
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt').replace(/>/g, '&gt');
}

/**
 * 格式化 Gemini 回复文本为 Telegram HTML 格式 -  增强版，全面支持 HTML 标签
 * @param {string} text  Gemini 回复的原始文本 (Markdown 风格)
 * @returns {string}  格式化后的 HTML 文本
 */
export function formatGeminiReply(text) {
	if (!text) return '';

	let formattedText = escapeHtml(text); //  初始 HTML 转义

	try {
		// 代码块格式化 (```lang\n code \n```  =>  <pre><code class="language-lang">...</code></pre>)
		formattedText = formattedText.replace(/```(\w*)\n([\s\S]+?)```/g, (_, lang, code) => {
			const languageClass = lang ? `language-${lang}` : '';
			return `<pre><code class="${languageClass}">${escapeHtml(code.trim())}</code></pre>`; // 代码块内部再次转义
		});

		// 行内代码格式化 (`` `code` `` =>  <code>code</code>)
		formattedText = formattedText.replace(/`([^`]+?)`/g, '<code>$1</code>');

		// 链接格式化 ([text](url)  =>  <a href="url">text</a>)
		formattedText = formattedText.replace(/\[([^\]]+?)\]\(([^\)]+?)\)/g, '<a href="$2">$1</a>');

		// 粗体格式化 (**bold**  =>  <b>bold</b>) -  同时支持 ** 和 __ 粗体
		formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
		formattedText = formattedText.replace(/__(.*?)\_\_/g, '<b>$1</b>'); //  !!!  新增 __ 粗体支持，统一使用 <b> 标签 !!!

		// 斜体格式化 (*italic*  =>  <i>italic</i>) -  同时支持 * 和 _ 斜体
		formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>');
		// formattedText = formattedText.replace(/\_(.*?)\_/g, '<i>$1</i>'); //  !!!  新增 _ 斜体支持，统一使用 <i> 标签 !!!

		// 下划线格式化 (__underline__  =>  <u>underline</u>) -  文档中 HTML 示例使用 <u>
		formattedText = formattedText.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>'); //  !!!  确保已有的 <u> 标签不被错误替换 !!!
		formattedText = formattedText.replace(/__(.*?)\_\_/g, '<u>$1</u>'); //  !!!  保留 __ 下划线支持，但使用 <u> 标签 !!!  (与粗体 __ 区分，此处可能有歧义，根据实际效果调整)

		// 删除线格式化 (~strike~  =>  <s>strike</s>)
		formattedText = formattedText.replace(/~(.*?)~/g, '<s>$1</s>');

		// 剧透格式化 (||spoiler||  =>  <tg-spoiler>spoiler</tg-spoiler>) -  同时支持 <tg-spoiler> 和 <span class="tg-spoiler">
		formattedText = formattedText.replace(/\|\|(.*?)\|\|/g, '<tg-spoiler>$1</tg-spoiler>');
		formattedText = formattedText.replace(/<tg-spoiler>(.*?)<\/tg-spoiler>/gi, '<tg-spoiler>$1</tg-spoiler>'); //  !!! 确保已有的 <tg-spoiler> 标签不被错误替换 !!!
		formattedText = formattedText.replace(/<span class="tg-spoiler">(.*?)<\/span>/gi, '<tg-spoiler>$1</tg-spoiler>'); //  !!! 统一使用 <tg-spoiler> 标签 !!!

		// 引用块格式化 (> quote  =>  <blockquote>quote</blockquote>) -  处理多行引用 (保持不变)
		formattedText = formattedText.replace(/(^> [^\n]+(\n> [^\n]+)*)(?:\n|$)/gm, (match) => {
			const blockquoteContent = match.replace(/^> /gm, '').trim(); // 去除每行开头的 "> " 和尾部空白
			return `<blockquote>${blockquoteContent}</blockquote>`;
		});

		// 可展开引用块格式化 (>> quote  =>  <blockquote expandable>quote</blockquote>) - 处理多行可展开引用 (保持不变)
		formattedText = formattedText.replace(/(^>> [^\n]+(\n>> [^\n]+)*)(?:\n|$)/gm, (match) => {
			const expandableBlockquoteContent = match.replace(/^>> /gm, '').trim(); // 去除每行开头的 ">> " 和尾部空白
			return `<blockquote expandable>${expandableBlockquoteContent}</blockquote>`;
		});

		return formattedText.trim();
	} catch (error) {
		console.error('格式化 Gemini 回复文本为 HTML 格式时发生错误:', error);
		return '格式化回复时出现问题，请检查 Gemini 回复内容。';
	}
}

/**
 * 格式化 Markdown 文本为 Telegram MarkdownV2 格式
 *  -  将标准 Markdown 语法转换为 Telegram MarkdownV2 语法
 *  -  并转义 MarkdownV2 语法中的特殊字符
 * @param {string} markdownText  标准 Markdown 文本
 * @returns {string}  格式化后的 MarkdownV2 文本
 */
export function formatGeminiReplyMarkdownV2(markdownText) {
	if (!markdownText) return '';

	let markdownv2Text = markdownText;

	try {
		//  转换 Markdown 语法为 MarkdownV2 语法

		// 粗体:  **bold**  =>  *bold*,  __bold__  =>  *bold*
		markdownv2Text = markdownv2Text.replace(/\*\*(.*?)\*\*/g, '*$1*');
		markdownv2Text = markdownv2Text.replace(/__(.*?)\_\_/g, '*$1*');

		// 斜体:  *italic*  =>  _italic_,  _italic_  =>  _italic_
		markdownv2Text = markdownv2Text.replace(/\*(.*?)\*/g, '_$1_');
		markdownv2Text = markdownv2Text.replace(/\_(.*?)\_/g, '_$1_');

		// 删除线:  ~~strikethrough~~  =>  ~strikethrough~
		markdownv2Text = markdownv2Text.replace(/~~(.*?)~~/g, '~$1~');

		//  !!!  MarkdownV2 强制转义处理 -  转义 MarkdownV2 特殊字符  !!!
		markdownv2Text = escapeMarkdownV2(markdownv2Text);

		return markdownv2Text.trim();
	} catch (error) {
		console.error('Markdown 文本转换为 MarkdownV2 格式时发生错误:', error);
		return '格式化回复为 MarkdownV2 格式时出现问题，请检查 Markdown 内容或转换规则。';
	}
}

/**
 * MarkdownV2 字符转义 -  转义 MarkdownV2 语法中的特殊字符
 *  -  参考 Telegram Bot API 文档 MarkdownV2 格式的 Escaping
 * @param {string} text  要转义的 MarkdownV2 文本
 * @returns {string}  转义后的 MarkdownV2 文本
 */
function escapeMarkdownV2(text) {
	if (!text) return '';

	//  !!!  合并所有需要转义的字符，并添加 "  !!!
	const markdownv2EscapeChars = /[_*[\]()~`>#+\-=|{}.!\\"]/g; //  MarkdownV2 需要转义的特殊字符,  !!!  添加 "  !!!
	return text.replace(markdownv2EscapeChars, '\\$&'); //  $&  表示匹配到的字符，前面加上 \ 进行转义
}
