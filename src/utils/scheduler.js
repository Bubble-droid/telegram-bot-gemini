// src/utils/scheduler.js
/**
 * 调度任意任务
 * @param {Env} env Durable Object Namespace 绑定，如 env.TIMER_DO
 * @param {string} action 任务类型，如 'deleteMessage'
 * @param {Object} params 任务参数对象
 * @param {number} delayMs 延迟毫秒数
 */
export async function scheduleTask(env, action, params, delayMs = 60000) {
	// 以 action+目标唯一标识构造实例名，确保幂等和隔离
	const name = `${action}-${JSON.stringify(params)}`;
	const id = env.TIMER_DO.idFromName(name);
	const stub = env.TIMER_DO.get(id);
	// POST 调度请求
	const res = await stub.fetch(
		new Request('https://scheduler', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action, params, delayMs }),
		}),
	);
	return res.json();
}

/**
 * 专用：延迟删除 Telegram 消息
 */
export async function scheduleDeletion(env, botToken, chatId, messageId, delayMs = 60000) {
	return scheduleTask(env, 'deleteMessage', { botToken, chatId, messageId }, delayMs);
}
