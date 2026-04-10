# ⚡ Cache Explorer 40: Cache Coherence Simulator

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

**Cache Explorer** is an advanced, highly interactive web-based simulator designed to visualize and teach the complex mechanics of **Cache Coherence Protocols** in multi-core processor architectures. 

Built with modern React and Tailwind CSS, this tool allows computer science students, hardware engineers, and developers to observe how hardware keeps memory synchronized across multiple independent CPU caches in real-time.

---

## 🚀 Features

- **Interactive Visual Architecture:** Watch data and invalidation signals travel across the common data bus between CPU Cores and Main Memory.
- **Multiple Protocols Supported:** Dynamically switch the ruleset your CPU follows.
  - **MSI** (Modified, Shared, Invalid)
  - **MESI** (Modified, Exclusive, Shared, Invalid)
  - **MOESI** (Modified, Owner, Exclusive, Shared, Invalid)
- **Predictive Prefetching (PPC):** Toggle advanced architectural features to see how hardware anticipates sequential memory reads and saves nanoseconds of latency.
- **Real-Time Metrics & Logs:** Track exact Hit Rates, Bus Events, and Memory Writes as well as microsecond-accurate operation traces.
- **Pre-builts Scenarios:** Load built-in edge cases like "False Sharing", "Producer-Consumer", and "Sequential Read Patterns" to understand failure states and optimizations.
- **Integrated Learning:** Comes with built-in, beautifully designed pages explaining exactly how to use the dashboard alongside a masterclass on Cache Coherence theory.

## 🛠️ Tech Stack

- **Framework:** [React 18](https://react.dev/) via [Vite](https://vitejs.dev/)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Components:** [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Routing:** React Router DOM

## 💻 Getting Started

### Prerequisites

You need Node.js (version 18+ recommended) and npm installed on your machine.

### Installation

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/YourUsername/cache-explorer-40.git
   cd cache-explorer-40
   ```

2. Install the application dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

## 📖 How to Use the Simulator

1. **Configure Architecture:** On the left panel, select your desired coherence protocol (e.g., MESI) and how many CPU cores you want to simulate.
2. **Queue Operations:** Add `READ` and `WRITE` operations targeting specific Hex memory addresses (e.g., `0xA1`).
3. **Execute:** Click "Step Next" to execute one operation and watch the slow-motion data animations, or click "Run All" to instantly calculate the results.
4. **Analyze:** Look at the visualizer in the center to see the new state blocks (M, E, S, I). Check the right-hand panel for your Cache Hit Rate and the detailed transaction logs.

*Tip: If you aren't sure where to start, click the **"Load Scenario"** button in the bottom left, or click the glowing **"✨ Start Here!"** button at the top of the interface!*

## 🧠 Educational Value

Writing multi-threaded applications is infamously difficult due to unpredictable memory states. This simulator explicitly breaks down the "magic" underlying those threads. By playing with the simulator, you will understand:
* Why writing to memory is so much slower than reading.
* How the **Exclusive (E)** state in MESI saves massive amounts of bus bandwidth.
* How false sharing destroys application performance.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
If you want to add a new protocol (like the Dragon protocol) or a new hardware feature simulation:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


---
*Architected and developed as a visual learning tool for modern Computer Architecture.*
