export interface Env {
	DISCORD_WEBHOOK_URL: string;
	ACCESS_KEY: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		const accessKey = url.searchParams.get("access_key");
		if (accessKey !== env.ACCESS_KEY) {
			return new Response("Unauthorized", { status: 401 });
		}

		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		try {
			// Parse the PayPal webhook payload
			const paypalEvent: Record<string, any> = await request.json();

			// Validate event type
			if (paypalEvent.event_type !== "PAYMENT.SALE.COMPLETED") {
				return new Response("Event type not supported", { status: 200 });
			}

			// Extract transaction details
			const { amount, id: transactionId } = paypalEvent.resource;
			const payerName = paypalEvent.resource.payer.payer_info.first_name;
			const currency = amount.currency;
			const value = amount.total;

			// Construct the Discord embed payload
			const discordPayload = {
				username: "PayPal Notification Bot",
				embeds: [
					{
						title: "New Payment Received!",
						description: `A payment has been successfully completed.`,
						fields: [
							{ name: "Payer Name", value: payerName, inline: true },
							{ name: "Amount", value: `${value} ${currency}`, inline: true },
							{ name: "Transaction ID", value: transactionId, inline: false },
						],
						color: 3066993, // Green color
						timestamp: new Date().toISOString(),
					},
				],
			};

			// Send the payload to Discord
			const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(discordPayload),
			});

			if (!discordResponse.ok) {
				throw new Error(`Discord webhook failed with status ${discordResponse.status}`);
			}

			return new Response("Notification sent successfully", { status: 200 });
		} catch (error) {
			console.error(error);
			return new Response("Error processing webhook", { status: 500 });
		}
	},
};
