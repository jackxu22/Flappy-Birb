# Flappy Birb

一个使用函数式响应式编程（FRP）原理从头构建的 Flappy Bird 游戏实现。

## 项目概述

本项目采用声明式状态流的设计理念，展示了如何使用 FRP 模式来构建游戏架构。整个游戏逻辑通过不可变状态转换和纯函数式编程实现，创造了一个清晰、可维护的代码结构。

## ✨ 功能特性

- **Reducer 流式架构**  
  - 状态是一个随时间变化的不可变对象。  
  - Reducer 是纯函数 `(State) => State`。  

- **流式组合**  
  - 独立流（`tick$`, `space$`, `pipes$`）合并成统一的时间线。  

- **通过 `scan` 实现状态机**  
  - 类似流水线：每个 reducer 按顺序产生新的状态。  

- **声明式的游戏生命周期**  
  - 开始、运行、结束、重启由算子控制：  
    - `exhaustMap` 避免游戏中途误触重启。  
    - `takeWhile` 碰撞时自动结束会话。  

- **严格的副作用边界**  
  - 核心逻辑全是纯函数，只有 `.subscribe()` 与 DOM 交互。  

---

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone https://github.com/your-username/flappy-birb.git
cd flappy-birb
```

### 2. 运行游戏
```bash
npm run dev
```

### 3. 在浏览器中打开
在浏览器中打开 http://localhost:5173


## 游戏操作

- **空格键**：控制小鸟跳跃
- **鼠标点击**：开始/重启游戏



## 技术栈

- TypeScript
- RxJS
- 函数式编程原理
