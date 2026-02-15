# AI-TEAM

**AI-TEAM** is a powerful Electron-based desktop application that orchestrates multiple advanced AI models (ChatGPT, Claude, Gemini, DeepSeek, Grok) into a cohesive, collaborative intelligence unit. It allows users to broadcast prompts to all connected AIs simultaneously, monitor their real-time analysis, and synthesize a definitive, unified response using a "Master Core" architecture.

![AI-TEAM Screenshot](screenshot_placeholder.png) *In-development preview*

## 🚀 Features

*   **Multi-Model Orchestration:** Seamlessly interact with ChatGPT, Claude, Gemini, DeepSeek, and Grok in a single window.
*   **Simultaneous Broadcasting:** Send a single prompt to all active AI agents at once.
*   **Real-Time Status Tracking:** Visual indicators for every stage of the AI lifecycle:
    *   🔴 **Loading/Offline:** Visualized by a red connection dot.
    *   🟢 **Ready/Online:** Visualized by a green connection dot.
    *   🟣 **Sending:** Message is being dispatched to the model.
    *   🟡 **Incoming:** Data is streaming from the model.
    *   🟢 **Ready:** Response is complete and stable.
*   **Master Core Synthesis:** Automatically aggregates unique insights from all agents and generates a final, synthesized report (using Gemini as the Judge/Master Core).
*   **Selective Activation:** Enable or disable specific AI agents on the fly using integrated checkboxes.
*   **Strict Output Formatting:** Enforces JSON-structured responses from AIs to ensure consistency and parsability.
*   **Multi-Language UI:** Fully localized for English and Turkish languages.

## 🛠️ Prerequisites

*   **Node.js** (v14 or higher recommended)
*   **npm** (usually comes with Node.js)
*   Active accounts for the respective AI services (ChatGPT, Claude, etc.) as the app relies on web-based injection.

## 📥 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/ai-team.git
    cd ai-team
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## ▶️ Usage

1.  **Start the application:**
    ```bash
    npm start
    ```

2.  **Login to AI Services:**
    *   On the first launch, you will see the login pages for each supported AI service in their respective panels.
    *   Log in to your accounts manually. The app preserves your session for future uses.

3.  **Broadcast a Prompt:**
    *   Type your question in the main input box at the bottom.
    *   Click **SUBMIT** (or press Enter).
    *   Watch as the "Status" indicators change from *SENDING* -> *INCOMING* -> *READY*.

4.  **Synthesize Results:**
    *   Once all active agents have finished responding, the system automatically triggers the **Master Core**.
    *   A synthesized final answer will appear in the chat stream, combining the best parts of every AI's response.

## ⚙️ Configuration

The application uses a `config.json` (created automatically on first run) to store preferences such as:
*   Selected Language (`en` / `tr`)
*   Active/Inactive Members
*   Window Dimensions

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/ai-team/issues).

## 📝 License

This project is licensed under the MIT License.
