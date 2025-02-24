// src/formatter.js

/**
 * HTML 字符转义 -  精简版本，仅转义 Telegram HTML 必需字符
 * @param {string} text  要转义的文本
 * @returns {string}  转义后的 HTML 文本
 */
function escapeHtml(text) {
	if (!text) return '';
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

		// 粗体格式化 (**bold**  =>  <b>bold</b>)
		formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

		// 斜体格式化 (*italic*  =>  <i>italic</i>)
		formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>');

		// 下划线格式化 (__underline__  =>  <u>underline</u>)
		formattedText = formattedText.replace(/__(.*?)__/g, '<u>$1</u>');

		// 删除线格式化 (~strike~  =>  <s>strike</s>)
		formattedText = formattedText.replace(/~(.*?)~/g, '<s>$1</s>');

		// 剧透格式化 (||spoiler||  =>  <tg-spoiler>spoiler</tg-spoiler>)
		formattedText = formattedText.replace(/\|\|(.*?)\|\|/g, '<tg-spoiler>$1</tg-spoiler>');

		// 引用块格式化 (> quote  =>  <blockquote>quote</blockquote>) -  处理多行引用
		formattedText = formattedText.replace(/(^> [^\n]+(\n> [^\n]+)*)(?:\n|$)/gm, (match) => {
			const blockquoteContent = match.replace(/^> /gm, '').trim(); // 去除每行开头的 "> " 和尾部空白
			return `<blockquote>${blockquoteContent}</blockquote>`;
		});

		// 可展开引用块格式化 (>> quote  =>  <blockquote expandable>quote</blockquote>) - 处理多行可展开引用
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
 * 格式化 HTML 文本为 Telegram MarkdownV2 格式 -  用于 HTML 格式发送失败时的备选方案
 *  -  需要处理 MarkdownV2 的转义规则，确保转换后的文本在 MarkdownV2 模式下正确解析
 * @param {string} htmlText  已经格式化为 HTML 的文本 (formatGeminiReply 函数的输出)
 * @returns {string}  格式化后的 MarkdownV2 文本
 */
export function formatGeminiReplyMarkdownV2(htmlText) {
	if (!htmlText) return '';

	let markdownv2Text = htmlText;

	try {
		//  反向转换 HTML 标签为 MarkdownV2 语法

		// <b>bold</b>  =>  *bold*
		markdownv2Text = markdownv2Text.replace(/<b>(.*?)<\/b>/gi, '*$1*');
		markdownv2Text = markdownv2Text.replace(/<strong>(.*?)<\/strong>/gi, '*$1*'); //  兼容 <strong> 标签

		// <i>italic</i>  =>  _italic_
		markdownv2Text = markdownv2Text.replace(/<i>(.*?)<\/i>/gi, '_$1_');
		markdownv2Text = markdownv2Text.replace(/<em>(.*?)<\/em>/gi, '_$1_'); //  兼容 <em> 标签

		// <u>underline</u>  =>  __underline__
		markdownv2Text = markdownv2Text.replace(/<u>(.*?)<\/u>/gi, '__$1__');
		markdownv2Text = markdownv2Text.replace(/<ins>(.*?)<\/ins>/gi, '__$1__'); // 兼容 <ins> 标签

		// <s>strikethrough</s>  =>  ~strikethrough~
		markdownv2Text = markdownv2Text.replace(/<s>(.*?)<\/s>/gi, '~$1~');
		markdownv2Text = markdownv2Text.replace(/<strike>(.*?)<\/strike>/gi, '~$1~'); //  兼容 <strike> 标签
		markdownv2Text = markdownv2Text.replace(/<del>(.*?)<\/del>/gi, '~$1~'); //  兼容 <del> 标签

		// <tg-spoiler>spoiler</tg-spoiler>  =>  ||spoiler||
		markdownv2Text = markdownv2Text.replace(/<tg-spoiler>(.*?)<\/tg-spoiler>/gi, '||$1||');
		markdownv2Text = markdownv2Text.replace(/<span class="tg-spoiler">(.*?)<\/span>/gi, '||$1||'); // 兼容 <span class="tg-spoiler">

		// <code>inline code</code>  =>  `inline code`
		markdownv2Text = markdownv2Text.replace(/<code>(.*?)<\/code>/gi, '`$1`');

		// <pre><code class="language-lang">code block</code></pre>  =>  ```lang\ncode block\n```
		markdownv2Text = markdownv2Text.replace(/<pre><code class="language-(\w+)">(.*?)<\/code><\/pre>/gi, '```$1\n$2\n```');
		markdownv2Text = markdownv2Text.replace(/<pre><code>(.*?)<\/code><\/pre>/gi, '``````\n$1\n``````'); //  处理没有 language class 的代码块

		// <a href="url">link text</a>  =>  [link text](url)
		markdownv2Text = markdownv2Text.replace(/<a href="([^"]+?)">(.*?)<\/a>/gi, '[$2]($1)');

		// <blockquote>blockquote</blockquote>  =>  > blockquote  (需要处理换行)
		markdownv2Text = markdownv2Text.replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1'.replace(/<br\s*\/?>/gi, '\n> ')); //  将 <br> 转换为换行 + "> "

		// <blockquote expandable>expandable blockquote</blockquote>  =>  >> expandable blockquote (需要处理换行)
		markdownv2Text = markdownv2Text.replace(/<blockquote expandable>(.*?)<\/blockquote>/gi, '>> $1'.replace(/<br\s*\/?>/gi, '\n>> ')); // 将 <br> 转换为换行 + ">> "

		//  MarkdownV2 强制转义处理 -  在转换后的 MarkdownV2 文本中，转义 MarkdownV2 特殊字符
		markdownv2Text = escapeMarkdownV2(markdownv2Text);

		return markdownv2Text.trim();
	} catch (error) {
		console.error('HTML 文本转换为 MarkdownV2 格式时发生错误:', error);
		return '格式化回复为 MarkdownV2 格式时出现问题，请检查 HTML 内容或转换规则。';
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

	const markdownv2EscapeChars = /[_*[\]()~`>#+\-=|{}.!]/g; //  MarkdownV2 需要转义的特殊字符
	return text.replace(markdownv2EscapeChars, '\\$&'); //  $&  表示匹配到的字符，前面加上 \ 进行转义
}
