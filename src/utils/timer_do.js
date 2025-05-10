// src/utils/timer_do.js

import { deleteTelegramMessage } from '../api/telegram-api';

// src/timer_do.js
export class TimerDO {
	constructor(ctx, env) {
		this.state = ctx.storage;
		this.env = env;
	}

	/**
	 * 接收调度请求：{ action, params, delayMs }
	 * - action: 字符串，表示要执行的任务类型
	 * - params: 任意对象，包含执行所需参数
	 * - delayMs: 延迟毫秒数，默认 60000（1 分钟）
	 */
	async fetch(request) {
		const { action, params, delayMs = 60000 } = await request.json();
		// 持久化任务信息
		await this.state.put('task', { action, params });
		// 计算绝对触发时间并设置 Alarm
		const runAt = Date.now() + delayMs;
		await this.state.setAlarm(runAt);
		return new Response(JSON.stringify({ status: 'scheduled', runAt }), { status: 200 });
	}

	/** Alarm 触发后调用此方法，执行对应 action */
	async alarm() {
		const task = await this.state.get('task');
		if (!task) return;

		const { action, params } = task;
		try {
			switch (action) {
				case 'deleteMessage':
					// 调用共享的删除函数（需在环境变量或模块中导入）
					await deleteTelegramMessage(params.botToken, params.chatId, params.messageId);
					break;
				// 可增添更多 case，如发送邮件、触发 Webhook 等
				default:
					console.warn(`Unknown action: ${action}`);
			}
		} finally {
			// 清理存储，下次可复用或删除实例
			await this.state.delete('task');
		}
	}
}
