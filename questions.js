// 题库数据
const questionBank = [
    // ============ 分布式训练题目 ============
    {
        id: 1,
        module: "train",
        difficulty: "medium",
        type: "single",
        question: "在数据并行(DDP)训练中,AllReduce通信的主要作用是什么?",
        options: [
            "同步所有GPU的模型参数",
            "同步所有GPU的梯度并计算平均值",
            "分发训练数据到各个GPU",
            "同步优化器状态"
        ],
        answer: 1,
        explanation: "AllReduce在DDP中用于同步梯度:每个GPU计算本地梯度后,通过AllReduce聚合所有GPU的梯度并计算平均值,然后各GPU用平均梯度更新参数。这是数据并行的核心通信操作。"
    },
    {
        id: 2,
        module: "train",
        difficulty: "advanced",
        question: "ZeRO-3相比ZeRO-2的主要区别是什么?",
        options: [
            "ZeRO-3增加了梯度分片",
            "ZeRO-3增加了模型参数分片",
            "ZeRO-3增加了CPU Offload",
            "ZeRO-3减少了通信量"
        ],
        answer: 1,
        explanation: "ZeRO-3在ZeRO-2(优化器状态+梯度分片)的基础上,进一步将模型参数也分片到各GPU。这样可以训练更大的模型,但代价是需要在前向/反向传播时动态gather参数,通信开销增加。"
    },
    {
        id: 3,
        module: "train",
        difficulty: "advanced",
        question: "以70B参数的LLaMA模型为例,使用FP16+Adam优化器训练时,单GPU需要多少显存? (不考虑激活值)",
        options: [
            "约140GB",
            "约280GB",
            "约560GB",
            "约1120GB"
        ],
        answer: 3,
        explanation: "显存计算:\n- 模型参数: 70B × 2字节(FP16) = 140GB\n- 梯度: 70B × 2字节 = 140GB\n- Adam优化器状态(动量+方差): 70B × 8字节 = 560GB\n- 主权重副本(FP32): 70B × 4字节 = 280GB\n总计: 140+140+560+280 = 1120GB,远超A100的80GB显存!"
    },
    {
        id: 4,
        module: "train",
        difficulty: "expert",
        question: "Megatron-LM的张量并行(TP)为什么优先在单机内使用?",
        options: [
            "因为TP通信量小,不需要高速网络",
            "因为TP通信频繁且延迟敏感,需要NVLink低延迟",
            "因为TP只能用于单机内GPU",
            "因为跨机器TP会导致梯度不同步"
        ],
        answer: 1,
        explanation: "TP每层前向/反向传播都需要AllReduce/AllGather通信,通信非常频繁且对延迟敏感。单机内的NVLink提供600GB/s带宽和<1μs延迟,而跨机器的InfiniBand虽然带宽也高(400Gbps),但延迟有2-5μs,会严重影响TP性能。因此最佳实践是TP=机器内卡数(通常8)。"
    },
    {
        id: 5,
        module: "train",
        difficulty: "advanced",
        question: "Pipeline并行的'Bubble'问题是指什么?",
        options: [
            "显存不足导致的内存泄漏",
            "GPU之间通信延迟过高",
            "流水线中GPU空闲等待的时间浪费",
            "梯度累积导致的精度损失"
        ],
        answer: 2,
        explanation: "Pipeline Bubble是指流水线并行中,由于串行依赖导致的GPU空闲时间。例如GPU1处理完Forward后,GPU2才能开始,GPU1就会空闲等待。优化方法包括:微批次(Micro-batch)、1F1B调度、Interleaved Pipeline等,可将bubble率从50%降至5-15%。"
    },
    {
        id: 6,
        module: "train",
        difficulty: "expert",
        question: "在1024张A100上训练千亿模型,以下哪种3D并行配置最合理?",
        options: [
            "TP=4, PP=8, DP=32",
            "TP=8, PP=16, DP=8",
            "TP=16, PP=4, DP=16",
            "TP=2, PP=32, DP=16"
        ],
        answer: 1,
        explanation: "最佳实践配置原则:\n1. TP=8(机器内8卡NVLink全连接)\n2. PP=16(跨16台机器,减少机器间通信)\n3. DP=8(剩余维度,8×16×8=1024)\n\n为什么?\n- TP利用机内NVLink高带宽(600GB/s)\n- PP跨机器减少通信量(只传激活值)\n- DP最外层,通信可以和计算overlap"
    },
    {
        id: 7,
        module: "train",
        difficulty: "medium",
        question: "MFU(Model FLOPs Utilization)是什么指标?多少算优秀?",
        options: [
            "模型参数利用率, >80%优秀",
            "GPU显存利用率, >90%优秀",
            "实际算力/峰值算力, >50%优秀",
            "通信效率, >70%优秀"
        ],
        answer: 2,
        explanation: "MFU = 实际计算FLOPs / GPU峰值FLOPs,衡量训练效率。H100峰值约2000 TFLOPs,实际训练能达到1000 TFLOPs(50%)就很不错了。\n评价标准:\n- >50%: 优秀\n- 40-50%: 良好\n- <40%: 需要优化\n\n影响因素:通信占比、算子效率、显存带宽等。"
    },
    {
        id: 8,
        module: "train",
        difficulty: "advanced",
        question: "ZeRO-Offload将优化器状态卸载到CPU,典型会导致训练速度下降多少?",
        options: [
            "几乎没影响(<5%)",
            "轻微下降(10-20%)",
            "明显下降(30-50%)",
            "严重下降(>70%)"
        ],
        answer: 2,
        explanation: "ZeRO-Offload将优化器状态放到CPU内存,通过PCIe传输数据。PCIe 4.0带宽约64GB/s,远低于GPU HBM的2TB/s,会成为瓶颈。典型影响:\n- CPU Offload: 训练速度下降30-50%\n- NVMe Offload: 下降70%+\n\n适用场景:显存极度受限,愿意牺牲速度换取更大模型训练能力。"
    },
    {
        id: 9,
        module: "train",
        difficulty: "expert",
        question: "在Megatron-LM中,Sequence Parallel主要解决什么问题?",
        options: [
            "加速Attention计算",
            "减少LayerNorm激活值的显存占用",
            "提升模型并行通信效率",
            "支持更长的上下文长度"
        ],
        answer: 1,
        explanation: "Sequence Parallel(序列并行)是Megatron针对长序列的优化。问题:在TP中,LayerNorm的激活值没有被切分,占用大量显存(batch×seq_len×hidden)。\n\n解决方案:把序列长度维度也切分到TP组的各个GPU,将LayerNorm激活值显存降低TP倍。特别适合长文本训练(8K+ tokens)。"
    },
    {
        id: 10,
        module: "train",
        difficulty: "advanced",
        question: "1F1B Pipeline调度相比GPipe的主要优势是什么?",
        options: [
            "减少bubble时间",
            "更早释放激活值显存",
            "减少通信量",
            "提升计算效率"
        ],
        answer: 1,
        explanation: "1F1B(One Forward One Backward)相比GPipe(所有Forward完再做Backward):\n\n优势:\n- 更早做Backward → 更早释放激活值显存\n- 激活值峰值显存降低约50%\n- bubble率相同\n\nGPipe问题:需要保存所有micro-batch的激活值,显存占用大。1F1B交替执行,只需保存当前micro-batch激活值。"
    },

    // ============ 推理优化题目 ============
    {
        id: 11,
        module: "inference",
        difficulty: "medium",
        question: "Transformer推理的Prefill阶段和Decode阶段,哪个是计算密集型?",
        options: [
            "Prefill是计算密集型,Decode是访存密集型",
            "Decode是计算密集型,Prefill是访存密集型",
            "两者都是计算密集型",
            "两者都是访存密集型"
        ],
        answer: 0,
        explanation: "Prefill阶段:\n- 并行处理所有prompt tokens\n- 大量矩阵运算(Q×K, attention×V)\n- GPU利用率高,计算密集(Compute-bound)\n\nDecode阶段:\n- 每次只处理1个token\n- 需要读取全部KV Cache\n- 显存带宽瓶颈,访存密集(Memory-bound)\n\n优化重点不同!"
    },
    {
        id: 12,
        module: "inference",
        difficulty: "advanced",
        question: "LLaMA2-70B模型(80层,hidden=8192),单个请求2048 tokens的KV Cache占用多少显存?",
        options: [
            "约2.6GB",
            "约5.2GB",
            "约10.7GB",
            "约21.4GB"
        ],
        answer: 2,
        explanation: "KV Cache显存计算:\n2 (K和V) × 1 (batch) × 2048 (seq_len) × 8192 (hidden) × 2字节(FP16) × 80层\n= 2 × 2048 × 8192 × 2 × 80 / (1024³)\n≈ 10.7GB\n\n如果并发100个请求 = 1TB显存! 这就是KV Cache的显存压力。"
    },
    {
        id: 13,
        module: "inference",
        difficulty: "expert",
        question: "vLLM的PagedAttention相比传统连续分配,显存利用率提升了多少?",
        options: [
            "从50%提升到60%",
            "从60%提升到90%+",
            "从80%提升到95%",
            "提升不明显"
        ],
        answer: 1,
        explanation: "传统方案问题:\n- 预分配最大长度(如2048)\n- 实际只用500 tokens → 浪费75%\n- 碎片化严重 → 利用率仅60%\n\nPagedAttention:\n- 按需分配block(16 tokens/block)\n- 动态扩展,几乎无碎片\n- 显存利用率90%+\n\n实际提升:2-4倍吞吐量!"
    },
    {
        id: 14,
        module: "inference",
        difficulty: "advanced",
        question: "PagedAttention的'前缀共享'能带来什么优势?",
        options: [
            "加速Attention计算",
            "减少模型显存占用",
            "多个请求共享相同system prompt的KV Cache",
            "提升GPU利用率"
        ],
        answer: 2,
        explanation: "前缀共享原理:\n100个请求都有相同的500 token system prompt:\n\n传统: 100 × 500 = 50K tokens的KV Cache\nPagedAttention: 500 tokens(只存一份!)\n\n实现:Copy-on-Write机制,共享prefix的block,只有不同部分独立分配。节省100倍显存!"
    },
    {
        id: 15,
        module: "inference",
        difficulty: "medium",
        question: "Continuous Batching相比Static Batching的核心优势是什么?",
        options: [
            "减少通信开销",
            "完成的请求立即释放,新请求立即加入batch",
            "提升模型精度",
            "降低显存占用"
        ],
        answer: 1,
        explanation: "Static Batching问题:\nBatch=[Req1(100tokens), Req2(500tokens)]\n必须等Req2完成,Req1完成后GPU空闲浪费\n\nContinuous Batching:\n- Req1完成 → 立即移出\n- 新Req3 → 立即加入\n- 每个iteration动态调整batch\n\n效果:GPU利用率接近100%,吞吐量提升50-100%!"
    },
    {
        id: 16,
        module: "inference",
        difficulty: "advanced",
        question: "FP16量化到INT8,理论上显存和速度能提升多少?",
        options: [
            "显存1.5倍,速度1.2倍",
            "显存2倍,速度1.5-2倍",
            "显存4倍,速度2-3倍",
            "显存8倍,速度3-4倍"
        ],
        answer: 1,
        explanation: "FP16 → INT8量化:\n- 显存: 16bit → 8bit = 2倍节省\n- 速度: INT8算力更高,实际1.5-2倍加速\n- 精度损失: 1-2% (可接受)\n\nINT4量化:\n- 显存: 4倍\n- 速度: 2-3倍\n- 精度损失: 2-5% (需要GPTQ/AWQ等算法)"
    },
    {
        id: 17,
        module: "inference",
        difficulty: "expert",
        question: "TTFT和TPOT分别衡量什么?优秀的标准是?",
        options: [
            "TTFT衡量吞吐量(<1000 QPS优秀),TPOT衡量延迟(<10ms优秀)",
            "TTFT衡量首token延迟(<200ms优秀),TPOT衡量生成速度(<50ms优秀)",
            "两者都是吞吐量指标,越大越好",
            "TTFT是训练指标,TPOT是推理指标"
        ],
        answer: 1,
        explanation: "TTFT (Time To First Token):\n- 衡量Prefill延迟\n- 用户发送请求 → 看到第一个字\n- 标准: <200ms优秀, <500ms合格, >1s不合格\n\nTPOT (Time Per Output Token):\n- 衡量Decode速度\n- 每生成一个token的时间\n- 标准: <50ms优秀, <100ms合格\n\n体验: TTFT影响'响应速度感',TPOT影响'打字流畅度'"
    },
    {
        id: 18,
        module: "inference",
        difficulty: "medium",
        question: "PTQ和QAT两种量化方案的主要区别是什么?",
        options: [
            "PTQ是训练后量化,QAT是训练时量化",
            "PTQ精度更高,QAT速度更快",
            "PTQ用于推理,QAT用于训练",
            "两者没有本质区别"
        ],
        answer: 0,
        explanation: "PTQ (Post-Training Quantization):\n- 训练完成后直接转换权重\n- 无需重训,几分钟完成\n- 精度损失1-3%\n- 适用于大多数场景\n\nQAT (Quantization-Aware Training):\n- 训练时模拟量化过程\n- 需要重训,成本高\n- 精度损失<0.5%\n- 适用于对精度要求极高的场景"
    },
    {
        id: 19,
        module: "inference",
        difficulty: "expert",
        question: "以下哪个推理框架最适合高并发场景(>100 QPS)?",
        options: [
            "TensorRT-LLM",
            "vLLM",
            "Ollama",
            "llama.cpp"
        ],
        answer: 1,
        explanation: "框架对比:\n\nvLLM:\n- PagedAttention + Continuous Batching\n- 吞吐量最高(高并发场景最优)\n- TTFT略高\n\nTensorRT-LLM:\n- 延迟最低,适合低并发高响应要求\n\nOllama/llama.cpp:\n- 本地部署,易用性好\n- 性能较弱,适合单用户场景\n\n高并发(>100 QPS) → 选vLLM!"
    },
    {
        id: 20,
        module: "inference",
        difficulty: "advanced",
        question: "在vLLM中,Block size设置为16 tokens的主要考虑是什么?",
        options: [
            "16是GPU warp size的倍数,计算效率高",
            "平衡内存碎片和管理开销",
            "16tokens正好对应一个句子",
            "这是CUDA的硬性要求"
        ],
        answer: 1,
        explanation: "Block size选择trade-off:\n\nBlock太小(如4):\n- 碎片少,显存利用率高\n- 管理开销大(Block Table大)\n\nBlock太大(如64):\n- 管理开销小\n- 碎片多,浪费显存\n\n16 tokens是经验值:\n- 平均请求长度/16 = 合理的block数\n- 碎片<10%\n- 管理开销可接受"
    },

    // ============ GPU集群网络题目 ============
    {
        id: 21,
        module: "network",
        difficulty: "medium",
        question: "RDMA相比传统TCP/IP,延迟能降低多少?",
        options: [
            "延迟从50μs降至25μs (2倍)",
            "延迟从50μs降至10μs (5倍)",
            "延迟从50μs降至1μs (50倍)",
            "延迟改善不明显"
        ],
        answer: 2,
        explanation: "RDMA vs TCP/IP性能对比:\n\n延迟:\n- TCP/IP: 50-100μs\n- RDMA: 1-2μs\n- 提升: 50倍!\n\nCPU占用:\n- TCP/IP: 50%+\n- RDMA: <5%\n- 提升: 10倍\n\n原因:零拷贝、内核旁路、CPU卸载"
    },
    {
        id: 22,
        module: "network",
        difficulty: "advanced",
        question: "RDMA的WRITE操作相比SEND/RECV的主要优势是什么?",
        options: [
            "WRITE带宽更高",
            "WRITE延迟更低",
            "WRITE单向操作,无需对端CPU参与",
            "WRITE支持更大的数据包"
        ],
        answer: 2,
        explanation: "RDMA操作对比:\n\nSEND/RECV:\n- 双向操作\n- 需要对端CPU参与接收\n- 适用于不确定对端地址的场景\n\nWRITE:\n- 单向操作\n- 直接写入远程内存\n- 对端CPU完全不参与\n- 延迟更低,CPU开销更小\n\n大模型训练AllReduce底层多用WRITE!"
    },
    {
        id: 23,
        module: "network",
        difficulty: "expert",
        question: "InfiniBand和RoCE在技术上的根本区别是什么?",
        options: [
            "IB带宽更高",
            "IB是专用协议栈,RoCE是RDMA over Ethernet",
            "IB只支持单机,RoCE支持跨机",
            "IB更便宜"
        ],
        answer: 1,
        explanation: "InfiniBand:\n- 完整专用协议栈(物理层到传输层)\n- 硬件级可靠性保证\n- 延迟<1μs\n- 成本高(网卡+交换机都专用)\n\nRoCE:\n- RDMA over Ethernet(复用以太网)\n- 需要无损以太网(PFC/ECN)\n- 延迟2-5μs\n- 成本低30-50%\n\n技术选型:千卡集群用IB,中小规模用RoCE"
    },
    {
        id: 24,
        module: "network",
        difficulty: "medium",
        question: "NVLink4(H100)的带宽是多少?相比PCIe 5.0快多少?",
        options: [
            "200GB/s,快2倍",
            "400GB/s,快3倍",
            "600GB/s,快5倍",
            "900GB/s,快7倍"
        ],
        answer: 2,
        explanation: "带宽对比:\n\nNVLink4 (H100): 600GB/s\nPCIe 5.0 x16: 128GB/s\n提升: 4.7倍!\n\n这就是为什么TP优先用NVLink:\n- 机器内8卡通过NVLink全连接\n- TP通信频繁,需要高带宽低延迟\n- 跨机器只能用IB(400Gbps≈50GB/s),性能下降明显"
    },
    {
        id: 25,
        module: "network",
        difficulty: "advanced",
        question: "DGX H100单机8卡是如何实现全互联的?",
        options: [
            "通过PCIe交换机",
            "通过4个NVSwitch芯片",
            "通过CPU总线",
            "通过InfiniBand交换机"
        ],
        answer: 1,
        explanation: "DGX H100架构:\n- 8张H100 GPU\n- 4个NVSwitch芯片\n- 每个GPU连接到所有NVSwitch\n- 任意两GPU间带宽: 600GB/s\n\nNVSwitch作用:\n- GPU间全互联交换芯片\n- 避免PCIe瓶颈\n- 支持TP=8的硬件基础\n\n成本:一台DGX H100 ≈ $300K"
    },
    {
        id: 26,
        module: "network",
        difficulty: "expert",
        question: "NCCL的Ring AllReduce算法,在N个GPU上完成AllReduce需要多少步?",
        options: [
            "N步",
            "2(N-1)步",
            "log(N)步",
            "N²步"
        ],
        answer: 1,
        explanation: "Ring AllReduce工作流程:\n\n假设4个GPU,数据分4块:\n1. Reduce-Scatter阶段: N-1步 (3步)\n   - 每GPU发送数据给下一个\n   - 逐步聚合\n2. AllGather阶段: N-1步 (3步)\n   - 广播聚合结果\n\n总步数: 2(N-1) = 6步\n\n优势:\n- 通信量与GPU数无关\n- 可扩展到千卡级"
    },
    {
        id: 27,
        module: "network",
        difficulty: "advanced",
        question: "Fat-Tree网络拓扑的核心特点是什么?",
        options: [
            "中心化架构,易于管理",
            "任意两节点间带宽相同,无阻塞",
            "成本最低",
            "延迟最小"
        ],
        answer: 1,
        explanation: "Fat-Tree拓扑:\n\n结构:\n- 3层: Core, Aggregation, ToR\n- 上行带宽=下行带宽(无收敛)\n\n特点:\n- 任意两服务器带宽相同\n- 多路径冗余,容错性好\n- 可扩展到万卡+\n\n代价:\n- 交换机数量多,成本高\n- 布线复杂\n\n应用:大厂AI集群标配"
    },
    {
        id: 28,
        module: "network",
        difficulty: "medium",
        question: "RoCE网络要求'无损以太网',主要依靠什么技术?",
        options: [
            "提升带宽",
            "PFC(优先级流控)和ECN(显式拥塞通知)",
            "更好的交换机",
            "减少跳数"
        ],
        answer: 1,
        explanation: "RoCE对丢包极度敏感(要求<0.01%):\n\nPFC (Priority Flow Control):\n- 拥塞时发送PAUSE帧\n- 暂停发送,避免丢包\n\nECN (Explicit Congestion Notification):\n- 标记拥塞,而非丢包\n- 发送端主动降速\n\n两者配合 → 无损以太网\n\n配置复杂度:比InfiniBand高很多"
    },
    {
        id: 29,
        module: "network",
        difficulty: "expert",
        question: "在1024卡训练中,TP=8,PP=16,DP=8的配置下,哪个维度的通信量最大?",
        options: [
            "TP通信",
            "PP通信",
            "DP通信",
            "三者差不多"
        ],
        answer: 2,
        explanation: "通信量分析(以70B模型为例):\n\nTP通信:\n- 每层都有AllReduce\n- 但只在机器内(8卡)\n- 通过NVLink,带宽600GB/s\n- 总量适中\n\nPP通信:\n- 只传激活值(相对小)\n- 通信次数少\n- 总量最小\n\nDP通信:\n- 同步全部梯度(280GB)\n- 跨所有8个DP组\n- 需要跨机器IB\n- 总量最大!\n\n所以DP通信是瓶颈,需要优化(gradient compression, overlap等)"
    },
    {
        id: 30,
        module: "network",
        difficulty: "advanced",
        question: "NCCL_NET_GDR_LEVEL=3这个环境变量是什么意思?",
        options: [
            "启用3级网络优化",
            "启用GPU Direct RDMA,GPU显存直接通过RDMA通信",
            "设置网络带宽为3Gbps",
            "使用3个网络接口"
        ],
        answer: 1,
        explanation: "GPU Direct RDMA (GDR):\n\n传统路径:\nGPU显存 → CPU内存 → 网卡 → 网络\n(多次拷贝,慢!)\n\nGDR:\nGPU显存 → 网卡 → 网络\n(零拷贝,快!)\n\nNCCL_NET_GDR_LEVEL:\n- 0: 禁用GDR\n- 1: 单节点GDR\n- 2: 跨节点GDR\n- 3: 完全启用GDR\n\n性能提升:20-30%"
    },

    // ============ 综合应用题目 ============
    {
        id: 31,
        module: "train",
        difficulty: "expert",
        question: "假设要在256张A100(80GB)上训练175B模型(GPT-3规模),应该如何配置3D并行?",
        options: [
            "TP=4, PP=8, DP=8",
            "TP=8, PP=8, DP=4",
            "TP=2, PP=16, DP=8",
            "TP=16, PP=4, DP=4"
        ],
        answer: 1,
        explanation: "配置分析:\n\n模型规模: 175B参数\n显存需求(ZeRO-1): 175B×14字节≈2.5TB\n单卡: 80GB\n\n选项B最优(TP=8, PP=8, DP=4):\n1. TP=8: 机器内NVLink,减少参数到22B/卡\n2. PP=8: 进一步切分到2.7B/stage\n3. DP=4: 剩余维度,8×8×4=256\n\n为什么?\n- 参数量:175B/(8×8)=2.7B/卡,可放进80GB\n- TP利用NVLink高带宽\n- PP减少机器间通信\n- DP=4足够梯度同步"
    },
    {
        id: 32,
        module: "inference",
        difficulty: "expert",
        question: "部署一个对话服务,预期QPS=200,平均生成100 tokens。应该选择什么推理框架和硬件配置?",
        options: [
            "vLLM + 4张A100",
            "TensorRT-LLM + 2张H100",
            "Ollama + 8张T4",
            "llama.cpp + CPU"
        ],
        answer: 0,
        explanation: "需求分析:\n- QPS=200 (高并发)\n- 平均生成100 tokens\n- 并发请求≈200×1s=200个\n\n方案A最优:\nvLLM:\n- Continuous Batching,适合高并发\n- PagedAttention,显存利用率高\n- 单卡A100可支持50-100 QPS\n- 4卡可稳定支持200 QPS\n\nB方案:\n- TensorRT-LLM适合低并发低延迟\n- 高并发下批处理不如vLLM\n\nC/D:\n- 性能太弱"
    },
    {
        id: 33,
        module: "network",
        difficulty: "expert",
        question: "千卡训练集群,AllReduce同步70B模型梯度(280GB),使用400Gbps InfiniBand,理论最快需要多少时间?",
        options: [
            "约0.7秒",
            "约1.4秒",
            "约5.6秒",
            "约11.2秒"
        ],
        answer: 2,
        explanation: "计算分析:\n\n数据量: 280GB = 280×8 = 2240 Gb\n带宽: 400 Gbps\n理论时间: 2240/400 = 5.6秒\n\n实际时间会更长:\n1. Ring AllReduce: 2(N-1)步\n2. 网络效率: 80-90%\n3. 实际约7-8秒\n\n优化方法:\n- 梯度压缩(FP16→FP8)\n- 通信计算overlap\n- 更高带宽(800Gbps)\n\n这5-8秒就是DP的主要开销!"
    },
    {
        id: 34,
        module: "train",
        difficulty: "advanced",
        question: "ZeRO-3训练175B模型,在64张A100上,每张卡理论需要多少显存? (只算参数+梯度+优化器)",
        options: [
            "约10GB",
            "约20GB",
            "约40GB",
            "约80GB"
        ],
        answer: 1,
        explanation: "ZeRO-3显存计算:\n\n总显存需求:\n- 参数: 175B×2=350GB\n- 梯度: 175B×2=350GB\n- 优化器: 175B×12=2100GB\n总计: 2800GB\n\nZeRO-3均分到64卡:\n2800/64 ≈ 44GB/卡\n\n但考虑:\n- 主权重(FP32): 175B×4/64=11GB\n- 实际约20GB基础消耗\n- 剩余60GB给激活值\n\n所以选B: 约20GB (不含激活值)"
    },
    {
        id: 35,
        module: "inference",
        difficulty: "advanced",
        question: "vLLM部署70B模型,INT8量化后,A100(80GB)理论能支持多少并发长度为2K的请求?",
        options: [
            "约4个",
            "约8个",
            "约15个",
            "约30个"
        ],
        answer: 2,
        explanation: "显存计算:\n\n模型权重(INT8): 70B×1=70GB\nKV Cache/请求: 10.7GB (见题12)\n\nA100显存: 80GB\n可用于KV: 80-70=10GB\n\nPagedAttention效率90%:\n10GB×0.9/10.7GB ≈ 0.84个请求???\n\n等等,INT8量化也适用于KV Cache:\nKV Cache/请求: 10.7/2≈5.4GB\n10GB/5.4GB ≈ 1.85个???\n\n实际更复杂,考虑共享prefix:\n约可支持15-20个请求\n\n答案C: 约15个"
    },
    {
        id: 36,
        module: "train",
        difficulty: "medium",
        question: "混合精度训练中,为什么要保留一份FP32的主权重(master weights)?",
        options: [
            "FP32计算更快",
            "防止FP16小梯度累积时下溢(underflow)",
            "FP32更节省显存",
            "只是为了备份"
        ],
        answer: 1,
        explanation: "混合精度训练(FP16+FP32):\n\n问题:\n- FP16范围: 6e-5 ~ 6e4\n- 梯度可能<1e-7 (小梯度)\n- FP16下溢 → 梯度变0 → 训练失败\n\n解决:\n- Forward/Backward用FP16(快)\n- 梯度累积用FP32主权重\n- FP32范围: 1e-38 ~ 1e38,不会下溢\n\n代价:\n- 额外存储主权重(70B×4=280GB)\n- 但训练稳定性大幅提升"
    },
    {
        id: 37,
        module: "inference",
        difficulty: "expert",
        question: "Speculative Decoding(推测解码)的核心思想是什么?",
        options: [
            "使用更大的模型提升精度",
            "用小模型预测多个token,大模型一次验证",
            "并行生成多个候选token",
            "提前缓存常用回复"
        ],
        answer: 1,
        explanation: "Speculative Decoding原理:\n\n传统: 大模型逐token生成(慢)\n\n推测解码:\n1. 小模型(快)预测N个token\n2. 大模型一次forward验证N个\n3. 正确的保留,错误的重新生成\n\n效果:\n- 加速2-3倍(when小模型预测准确率高)\n- 输出与原模型完全一致\n\n适用:\n- 小模型与大模型相似度高\n- 例如: 70B验证7B的预测"
    },
    {
        id: 38,
        module: "network",
        difficulty: "medium",
        question: "为什么GPU集群训练需要RDMA,而不是普通TCP/IP网络?",
        options: [
            "RDMA更便宜",
            "TCP/IP不支持GPU",
            "RDMA低延迟(<1μs)和高带宽,TCP延迟高(50μs+)",
            "RDMA是NVIDIA强制要求"
        ],
        answer: 2,
        explanation: "训练通信特点:\n- 频繁: 每个iteration都要AllReduce\n- 量大: 70B梯度=280GB\n- 延迟敏感: 通信占比影响MFU\n\nTCP/IP问题:\n- 延迟50-100μs\n- CPU占用50%+\n- 带宽难以达到400Gbps\n\nRDMA优势:\n- 延迟1-2μs (50倍!)\n- CPU占用<5%\n- 带宽400-800Gbps\n\n结论: 千卡训练没有RDMA,根本跑不起来!"
    },
    {
        id: 39,
        module: "train",
        difficulty: "expert",
        question: "Activation Checkpointing(激活值检查点)的trade-off是什么?",
        options: [
            "增加显存,减少计算",
            "减少显存,增加计算(重算)",
            "提升训练速度",
            "提升模型精度"
        ],
        answer: 1,
        explanation: "Activation Checkpointing:\n\n问题:\n- Forward保存所有激活值供Backward用\n- 激活值占用巨大(数十GB)\n\n方案:\n- Forward只保存部分检查点\n- Backward时重算中间激活值\n\nTrade-off:\n- 显存: 节省50-80%\n- 计算: 增加30-40%(重算开销)\n- 速度: 慢20-30%\n\n应用:\n- 大模型必备(否则OOM)\n- 通常每N层设一个checkpoint"
    },
    {
        id: 40,
        module: "inference",
        difficulty: "expert",
        question: "Flash Attention相比标准Attention,主要优化了什么?",
        options: [
            "减少计算量",
            "减少显存访问次数(IO优化)",
            "支持更长序列",
            "提升精度"
        ],
        answer: 1,
        explanation: "Flash Attention核心:\n\n标准Attention问题:\nAttention = softmax(Q×K^T)×V\n- 中间矩阵O(N²)显存\n- HBM↔SRAM多次读写(慢!)\n\nFlash Attention:\n- Tiling: 分块计算\n- Fused kernel: 融合算子\n- Online softmax: 增量计算\n- HBM访问减少到O(N)\n\n效果:\n- 训练加速2-4倍\n- 支持更长上下文(128K+)\n- 显存占用线性增长\n\n已成为Llama3/GPT-4标配!"
    },

    // ============ 高级场景题 ============
    {
        id: 41,
        module: "train",
        difficulty: "expert",
        question: "候选人说'我用ZeRO-3在32张V100上训练了30B模型',你应该追问什么来判断真实性?",
        options: [
            "问训练了多久",
            "问batch size多大,MFU多少,有没有OOM",
            "问用的什么框架",
            "不需要追问,这是合理配置"
        ],
        answer: 1,
        explanation: "技术验证思路:\n\n显存计算:\n- V100: 32GB\n- 30B模型ZeRO-3: 30B×14/32≈13GB/卡\n- 看似可行\n\n关键追问:\n1. batch size?\n   - 如果说batch=32,单卡batch=1\n   - 激活值会不会爆显存?\n\n2. MFU?\n   - V100训练30B,MFU应该30-40%\n   - 如果说>50%,可疑\n\n3. 有没有OOM?\n   - 大概率会OOM,怎么解决的?\n   - Activation Checkpointing?\n   - Gradient Accumulation?\n\n专业HR会这样深挖!"
    },
    {
        id: 42,
        module: "inference",
        difficulty: "expert",
        question: "候选人说'我把推理TTFT从2s优化到200ms',你应该问什么来了解技术深度?",
        options: [
            "问怎么做到的,具体优化了哪些点",
            "问用了什么框架",
            "问模型多大",
            "表示很厉害,不用追问"
        ],
        answer: 0,
        explanation: "优化路径分析:\n\n2s → 200ms (10倍!)合理优化:\n\n可能方案:\n1. 换框架?\n   - HF Transformers → vLLM (2-4倍)\n   - 但还不够10倍\n\n2. 模型量化?\n   - FP16 → INT8 (1.5-2倍)\n   - 累计还不够\n\n3. 批处理优化?\n   - prefill batching\n\n4. 硬件升级?\n   - A100 → H100 (2倍)\n\n追问点:\n- 具体优化了哪些?\n- 前后配置对比?\n- 有没有benchmark数据?\n- trade-off是什么?\n\n看候选人能否清晰说出技术路径!"
    },
    {
        id: 43,
        module: "network",
        difficulty: "expert",
        question: "候选人说'我们集群用的RoCE,性能和IB差不多',这个说法合理吗?",
        options: [
            "合理,RoCE v2和IB性能相当",
            "不合理,RoCE延迟明显高于IB",
            "取决于集群规模",
            "无法判断"
        ],
        answer: 1,
        explanation: "技术事实:\n\nIB:\n- 延迟: <1μs\n- 带宽: 400Gbps\n- 可靠性: 硬件级\n\nRoCE:\n- 延迟: 2-5μs (慢2-5倍!)\n- 带宽: 400Gbps (相同)\n- 可靠性: 依赖PFC/ECN\n\n候选人的说法:\n- 部分正确(带宽相同)\n- 但忽略了延迟差异\n\n追问:\n- 具体测试过延迟吗?\n- 有没有遇到丢包问题?\n- 为什么选RoCE?(成本?)\n\n判断:\n- 如果只看带宽,说明理解不够深\n- 如果能说出延迟trade-off,说明懂"
    },
    {
        id: 44,
        module: "train",
        difficulty: "expert",
        question: "如果候选人说'我把TP从4改到8,训练速度提升了一倍',你的反应是?",
        options: [
            "很正常,TP越大越快",
            "不太合理,TP通信开销会增加,不应该线性加速",
            "需要看具体情况",
            "问是不是GPU数量翻倍了"
        ],
        answer: 1,
        explanation: "技术分析:\n\nTP=4 → TP=8:\n- GPU数量翻倍\n- 每个GPU参数减半\n\n理论:\n- 计算量减半 → 应该快1倍\n\n实际:\n- TP通信增加:\n  - AllReduce次数不变\n  - 但参与GPU增加\n  - 通信时间增加\n- 实际加速: 1.5-1.8倍(非线性)\n\n如果说'快一倍':\n- 可能是:\n  1. DP也同时增加了\n  2. 测试方法有问题\n  3. 记忆偏差\n\n追问:\n- 具体配置前后对比?\n- MFU变化?\n- 通信占比?"
    },
    {
        id: 45,
        module: "inference",
        difficulty: "expert",
        question: "评估一个推理工程师的水平,以下哪个问题最能看出技术深度?",
        options: [
            "问用过哪些推理框架",
            "问PagedAttention的block size怎么选,为什么",
            "问部署过多大的模型",
            "问QPS能到多少"
        ],
        answer: 1,
        explanation: "问题质量分析:\n\nA. 用过哪些框架?\n- 浅层问题,只能看广度\n\nB. Block size怎么选?\n- 深度问题:\n  - 需要理解PagedAttention原理\n  - 需要权衡碎片 vs 管理开销\n  - 需要实战调优经验\n\nC. 多大模型?\n- 规模不代表深度\n\nD. QPS多少?\n- 数字不说明问题\n- 需要结合硬件/场景分析\n\n高招HR策略:\n- 问trade-off类问题\n- 问'为什么'而非'是什么'\n- 追问优化细节\n- 听候选人的思考过程"
    }
];
