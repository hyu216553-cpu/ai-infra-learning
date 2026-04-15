// 知识库数据
const knowledgeBase = {
    train: {
        name: "分布式训练",
        content: `
<h2>📖 分布式训练深度解析</h2>

<h3>1. 数据并行 (Data Parallel)</h3>
<p><strong>核心原理:</strong> 每个GPU处理不同的数据batch,模型参数在所有GPU上保持一致。</p>
<ul>
    <li><strong>Forward Pass:</strong> 各GPU独立计算</li>
    <li><strong>Backward Pass:</strong> 计算本地梯度</li>
    <li><strong>AllReduce通信:</strong> 同步所有GPU的梯度</li>
    <li><strong>参数更新:</strong> 使用平均梯度更新模型</li>
</ul>

<p><strong>DDP vs DP 的关键差异:</strong></p>
<ul>
    <li><strong>DP (旧):</strong> 单进程多线程,受Python GIL锁限制</li>
    <li><strong>DDP (新):</strong> 多进程架构,Ring-AllReduce通信,性能提升3-5倍</li>
</ul>

<p><strong>通信开销分析:</strong></p>
<pre>
通信量 = 模型参数量 × 4字节 (FP32)
例: 70B模型 = 70B × 4 = 280GB
优化策略:
- 梯度压缩 (减少精度)
- 混合精度训练 (FP16)
- 通信计算overlap (NCCL优化)
</pre>

<h3>2. ZeRO优化器 (DeepSpeed核心技术)</h3>
<p><strong>为什么需要ZeRO?</strong> 大模型训练的显存瓶颈</p>
<pre>
以70B模型为例,单GPU显存占用:
- 模型参数:    70B × 2字节(FP16) = 140GB
- 梯度:        70B × 2字节        = 140GB  
- 优化器状态:  70B × 12字节(Adam) = 840GB
总计:          1120GB (A100单卡只有80GB!)
</pre>

<p><strong>ZeRO三阶段:</strong></p>

<p><span class="highlight">Stage 1: 优化器状态分片 (Os)</span></p>
<ul>
    <li>原理: 每个GPU只保存1/N的优化器状态</li>
    <li>显存节省: ~4倍 (Adam优化器场景)</li>
    <li>通信增加: 参数广播 (Broadcast)</li>
    <li>适用: 模型能放进单卡,但优化器放不下</li>
</ul>

<p><span class="highlight">Stage 2: 梯度分片 (Os+G)</span></p>
<ul>
    <li>原理: Stage1基础上,梯度也分片</li>
    <li>显存节省: ~8倍</li>
    <li>通信增加: Reduce-Scatter + AllGather</li>
    <li>适用: 100B参数以下模型</li>
</ul>

<p><span class="highlight">Stage 3: 参数分片 (Os+G+P)</span></p>
<ul>
    <li>原理: 连模型参数都分片,完全分布式</li>
    <li>显存节省: 线性扩展 (与GPU数成正比)</li>
    <li>通信开销: 最大,需要动态参数gather</li>
    <li>适用: 千亿级超大模型 (175B+)</li>
</ul>

<p><strong>ZeRO-Offload: CPU/NVMe卸载</strong></p>
<ul>
    <li><strong>CPU Offload:</strong> 优化器状态放CPU内存,节省显存</li>
    <li><strong>NVMe Offload:</strong> 甚至可以放到SSD (极端场景)</li>
    <li><strong>代价:</strong> PCIe带宽瓶颈,训练速度下降30-50%</li>
    <li><strong>适用:</strong> 显存极度受限,可牺牲速度换空间</li>
</ul>

<h3>3. Megatron-LM 张量并行 (TP)</h3>
<p><strong>核心思想:</strong> 算子内并行 (不是按层切,而是切单个算子)</p>

<p><strong>MLP层切分原理:</strong></p>
<pre>
Y = GeLU(XA) × B

切分方案:
A → [A1, A2]  (按列切分)
B → [B1]      (按行切分)
      [B2]

执行:
GPU1: Y1 = GeLU(XA1) × B1
GPU2: Y2 = GeLU(XA2) × B2
最后: AllReduce(Y1 + Y2) → Y
</pre>

<p><strong>Attention层切分:</strong></p>
<pre>
Q, K, V = X × Wq, X × Wk, X × Wv

切分方案:
- 按attention head切分 (每个GPU算部分head)
- 每个GPU计算: Attention_i = softmax(Q_i × K_i^T) × V_i
- 最后: AllReduce合并所有head结果
</pre>

<p><strong>关键通信算子:</strong></p>
<ul>
    <li><strong>AllReduce:</strong> 前向传播最后聚合结果</li>
    <li><strong>AllGather:</strong> 反向传播梯度聚合</li>
    <li><strong>通信量:</strong> 每层都有通信,累加起来很大</li>
    <li><strong>延迟敏感:</strong> 需要RDMA低延迟网络 (InfiniBand)</li>
</ul>

<p><strong>Sequence Parallel (序列并行):</strong></p>
<ul>
    <li>问题: LayerNorm的激活值占用显存太大</li>
    <li>方案: 把序列长度维度也切分</li>
    <li>适用: 长文本训练 (上下文 > 8K tokens)</li>
</ul>

<h3>4. Pipeline Parallel (流水线并行)</h3>
<p><strong>核心思想:</strong> 按层切分模型到不同GPU</p>
<pre>
模型切分示例 (40层Transformer):
GPU1: Layer 1-10
GPU2: Layer 11-20
GPU3: Layer 21-30
GPU4: Layer 31-40
</pre>

<p><strong>Pipeline Bubble (气泡) 问题:</strong></p>
<pre>
时间 →
GPU1: [F1][F2][F3][F4]           [B4][B3][B2][B1]
GPU2:     [F1][F2][F3][F4]   [B4][B3][B2][B1]
GPU3:         [F1][F2][F3][F4][B3][B2][B1]
GPU4:             [F1][F2][F3][B2][B1]
              ↑ 这些空白就是bubble (GPU空闲浪费)
</pre>

<p><strong>GPipe: 微批次 (Micro-batch) 优化</strong></p>
<ul>
    <li>把batch切成多个micro-batch顺序执行</li>
    <li>填充bubble,提升GPU利用率</li>
    <li>代价: 激活值显存占用增加 (需要保存多个micro-batch)</li>
</ul>

<p><strong>1F1B Schedule (Megatron优化):</strong></p>
<ul>
    <li><strong>1F1B:</strong> One Forward, One Backward交替执行</li>
    <li><strong>优势:</strong> 更早释放激活值显存</li>
    <li><strong>Bubble率公式:</strong> (PP-1) / (PP + micro_batches)</li>
    <li><strong>示例:</strong> PP=4, micro=16 → bubble=15%</li>
</ul>

<p><strong>Interleaved Pipeline (虚拟流水线):</strong></p>
<ul>
    <li>每个GPU负责多个不连续的层段</li>
    <li>示例: GPU1负责Layer1-5和Layer21-25</li>
    <li>效果: Bubble进一步减少到~8%</li>
</ul>

<h3>5. 3D并行 (DP+TP+PP) 混合策略</h3>
<p><strong>为什么需要混合?</strong> 单一并行的局限性</p>
<ul>
    <li><strong>纯DP:</strong> 通信量太大 (所有梯度都要同步)</li>
    <li><strong>纯TP:</strong> 跨机器通信延迟高</li>
    <li><strong>纯PP:</strong> Bubble浪费算力</li>
</ul>

<p><strong>最佳实践配置 (1024张A100训练千亿模型):</strong></p>
<pre>
TP = 8    (机器内8卡通过NVLink互联)
PP = 16   (跨16台机器,减少机器间通信)
DP = 8    (剩余维度做数据并行)
总GPU数 = 8 × 16 × 8 = 1024
</pre>

<p><strong>配置原则:</strong></p>
<ul>
    <li><strong>TP优先机器内:</strong> 利用NVLink高带宽 (600GB/s)</li>
    <li><strong>PP跨机器:</strong> 减少节点间通信量</li>
    <li><strong>DP填充剩余:</strong> 数据并行最简单高效</li>
</ul>

<p><strong>性能调优关键指标:</strong></p>
<ul>
    <li><strong>MFU (Model FLOPs Utilization):</strong> 实际算力/峰值算力
        <ul>
            <li>目标: MFU > 50% (优秀), > 40% (合格)</li>
        </ul>
    </li>
    <li><strong>GPU利用率:</strong> > 90% (计算时间占比)</li>
    <li><strong>通信占比:</strong> < 20% (理想状态)</li>
</ul>
        `
    },
    
    inference: {
        name: "推理优化",
        content: `
<h2>⚡ 推理优化深度解析</h2>

<h3>1. Transformer推理两阶段</h3>

<p><strong>Prefill阶段 (预填充):</strong></p>
<ul>
    <li><strong>输入:</strong> 完整prompt (例如: 用户的问题)</li>
    <li><strong>计算:</strong> 并行处理所有tokens,生成KV Cache</li>
    <li><strong>输出:</strong> 第一个生成token + 完整KV Cache</li>
    <li><strong>特点:</strong> 计算密集 (Compute-bound)</li>
    <li><strong>优化重点:</strong> 提升GPU利用率,批处理</li>
</ul>

<p><strong>Decode阶段 (解码):</strong></p>
<ul>
    <li><strong>输入:</strong> 单个新token</li>
    <li><strong>计算:</strong> Attention需读取全部KV Cache</li>
    <li><strong>输出:</strong> 下一个token</li>
    <li><strong>特点:</strong> 访存密集 (Memory-bound)</li>
    <li><strong>优化重点:</strong> 减少显存访问,KV Cache管理</li>
</ul>

<p><strong>性能指标:</strong></p>
<ul>
    <li><strong>TTFT (Time To First Token):</strong> Prefill延迟
        <ul>
            <li>优秀: < 200ms</li>
            <li>合格: < 500ms</li>
            <li>不合格: > 1s</li>
        </ul>
    </li>
    <li><strong>TPOT (Time Per Output Token):</strong> Decode延迟
        <ul>
            <li>优秀: < 50ms</li>
            <li>合格: < 100ms</li>
        </ul>
    </li>
</ul>

<h3>2. KV Cache 深度剖析</h3>

<p><strong>什么是KV Cache?</strong></p>
<pre>
Attention(Q, K, V) = softmax(Q × K^T) × V

生成每个token时:
- 计算当前Q (新token的query)
- 读取历史K, V (所有之前tokens的key/value)
- 如果不缓存,每次都要重新计算所有历史tokens!

KV Cache: 缓存历史K, V,避免重复计算
</pre>

<p><strong>显存占用分析:</strong></p>
<pre>
单层KV Cache显存占用:
2 (K和V) × batch_size × seq_len × hidden_dim × 2字节(FP16)

LLaMA2-70B示例 (80层, hidden=8192):
2 × 1 × 2048 × 8192 × 2 × 80 = 10.7GB (单个请求!)

并发100个请求 = 1TB显存!
</pre>

<p><strong>KV Cache的三大问题:</strong></p>
<ul>
    <li><strong>显存占用巨大:</strong> 长文本场景占满显存</li>
    <li><strong>碎片化严重:</strong> 不同请求长度不同,内存碎片多</li>
    <li><strong>动态增长:</strong> 生成过程中持续增长,难以预估</li>
</ul>

<h3>3. vLLM PagedAttention 核心原理</h3>

<p><strong>灵感来源:</strong> 操作系统虚拟内存分页机制</p>

<p><strong>传统方案 vs PagedAttention:</strong></p>
<pre>
传统方案:
- 连续分配: [Token1][Token2][Token3]...[TokenN]
- 预分配最大长度 (例如2048)
- 实际只用500 → 浪费75%显存
- 碎片化严重

PagedAttention:
- 分页管理: 每个Block=16 tokens
- 按需分配: 用多少分配多少
- 显存利用率: 60% → 90%+
</pre>

<p><strong>Block机制详解:</strong></p>
<pre>
物理内存: [Block0][Block1][Block2]...[BlockN]

逻辑映射:
Request1 (48 tokens) → Block0, Block3, Block5 (3个block)
Request2 (32 tokens) → Block1, Block4 (2个block)

Block Table (映射表):
Req1: [0→0, 1→3, 2→5]
Req2: [0→1, 1→4]
</pre>

<p><strong>核心优势:</strong></p>
<ul>
    <li><strong>减少碎片:</strong> 接近完美利用显存 (90%+)</li>
    <li><strong>共享前缀:</strong> 多个请求共享system prompt
        <ul>
            <li>示例: 100个请求共享同一个500 token的prompt</li>
            <li>传统: 100 × 500 = 50K tokens显存</li>
            <li>PagedAttention: 500 tokens显存 (只存一份)</li>
        </ul>
    </li>
    <li><strong>动态扩展:</strong> 按需分配block,不浪费</li>
</ul>

<p><strong>实现细节:</strong></p>
<ul>
    <li><strong>Block Table:</strong> 逻辑block → 物理block映射</li>
    <li><strong>Copy-on-Write:</strong> 共享前缀时的写时复制</li>
    <li><strong>Eviction Policy:</strong> 显存不足时的淘汰策略 (LRU)</li>
</ul>

<p><strong>性能提升数据:</strong></p>
<ul>
    <li>显存利用率: 60% → 90%+</li>
    <li>吞吐量: 2-4倍提升 (vs HuggingFace TGI)</li>
    <li>并发能力: 3-5倍提升</li>
</ul>

<h3>4. Continuous Batching (连续批处理)</h3>

<p><strong>传统Static Batching的问题:</strong></p>
<pre>
Batch = [
    Req1 (生成100 tokens),
    Req2 (生成500 tokens),
    Req3 (生成200 tokens)
]

问题: 必须等最长的Req2完成,整个batch才能释放
→ Req1和Req3完成后GPU空闲,资源浪费
→ 新请求必须等待,延迟增加
</pre>

<p><strong>Continuous Batching原理:</strong></p>
<pre>
动态调度:
Step 1: Batch = [Req1, Req2, Req3]
Step 50: Req1完成 → 立即移出,加入Req4
        Batch = [Req2, Req3, Req4]
Step 100: Req3完成 → 立即移出,加入Req5
         Batch = [Req2, Req4, Req5]
...
每个iteration都重新组batch
</pre>

<p><strong>核心优势:</strong></p>
<ul>
    <li><strong>GPU利用率:</strong> 接近100% (没有空闲等待)</li>
    <li><strong>延迟降低:</strong> 不用等慢请求,立即响应</li>
    <li><strong>吞吐量:</strong> 提升50-100%</li>
</ul>

<p><strong>实现挑战:</strong></p>
<ul>
    <li><strong>调度开销:</strong> 每步都要重新调度 (但很小)</li>
    <li><strong>内存管理:</strong> 需要PagedAttention配合</li>
    <li><strong>优先级:</strong> 如何处理不同优先级请求</li>
</ul>

<h3>5. 模型量化 (Quantization)</h3>

<p><strong>量化原理:</strong></p>
<pre>
FP16 → INT8 量化:
INT8 = round(FP16 / scale)
反量化: FP16_approx = INT8 × scale

示例:
FP16 = 3.14159
scale = 0.1
INT8 = round(3.14159 / 0.1) = 31
反量化 = 31 × 0.1 = 3.1 (精度损失0.04)
</pre>

<p><strong>量化方案对比:</strong></p>

<p><span class="highlight">PTQ (Post-Training Quantization 训练后量化)</span></p>
<ul>
    <li><strong>无需重训:</strong> 直接转换权重</li>
    <li><strong>精度损失:</strong> 1-3%</li>
    <li><strong>速度:</strong> 几分钟完成</li>
    <li><strong>适用:</strong> 大多数场景,快速部署</li>
</ul>

<p><span class="highlight">QAT (Quantization-Aware Training 量化感知训练)</span></p>
<ul>
    <li><strong>需要重训:</strong> 训练时模拟量化</li>
    <li><strong>精度损失:</strong> < 0.5%</li>
    <li><strong>成本:</strong> 高,需要大量数据和算力</li>
    <li><strong>适用:</strong> 对精度要求极高</li>
</ul>

<p><span class="highlight">GPTQ / AWQ (混合量化)</span></p>
<ul>
    <li><strong>混合精度:</strong> 重要权重保持FP16,其他INT4</li>
    <li><strong>精度损失:</strong> < 1%</li>
    <li><strong>适用:</strong> INT4量化场景</li>
</ul>

<p><strong>量化效果数据:</strong></p>
<pre>
FP16 → INT8:
- 显存节省: 2倍
- 推理加速: 1.5-2倍
- 精度损失: 1-2%

FP16 → INT4:
- 显存节省: 4倍
- 推理加速: 2-3倍
- 精度损失: 2-5%
</pre>

<p><strong>量化粒度:</strong></p>
<ul>
    <li><strong>Per-tensor:</strong> 整个tensor一个scale (简单,精度差)</li>
    <li><strong>Per-channel:</strong> 每个channel独立scale (精度好)</li>
    <li><strong>Group-wise:</strong> 分组量化 (平衡)</li>
</ul>

<h3>6. 推理框架对比</h3>

<p><strong>vLLM (最流行):</strong></p>
<ul>
    <li>优势: PagedAttention, 吞吐量最高</li>
    <li>劣势: TTFT略高</li>
    <li>适用: 高并发场景 (>100 QPS)</li>
</ul>

<p><strong>TensorRT-LLM (NVIDIA官方):</strong></p>
<ul>
    <li>优势: 延迟最低, kernel优化极致</li>
    <li>劣势: 编译复杂,灵活性差</li>
    <li>适用: 延迟敏感场景</li>
</ul>

<p><strong>SGLang (新秀):</strong></p>
<ul>
    <li>优势: RadixAttention, 前缀树共享</li>
    <li>劣势: 生态不成熟</li>
    <li>适用: 大量前缀共享场景</li>
</ul>
        `
    },
    
    network: {
        name: "GPU集群网络",
        content: `
<h2>🌐 GPU集群网络深度解析</h2>

<h3>1. RDMA技术核心原理</h3>

<p><strong>传统TCP/IP的问题:</strong></p>
<pre>
应用层数据传输流程:
应用 → 用户态缓冲区 → 系统调用 → 内核态缓冲区 → 网卡 → 网络
                    ↑
            多次内存拷贝 (4次!)
            CPU全程参与 (占用50%+)
            延迟: 50-100μs
</pre>

<p><strong>RDMA (Remote Direct Memory Access):</strong></p>
<pre>
应用 → 直接写入网卡 → 网络 → 远程应用内存
      ↑
  零拷贝 (Zero-Copy)
  内核旁路 (Kernel Bypass)
  CPU卸载 (CPU Offload)
  延迟: 1-2μs
</pre>

<p><strong>性能提升对比:</strong></p>
<pre>
指标          TCP/IP      RDMA        提升
--------------------------------------------
延迟          50μs        1μs         50倍
带宽          100Gbps     400Gbps     4倍
CPU占用       50%         < 5%        10倍
吞吐量        2M msg/s    100M msg/s  50倍
</pre>

<p><strong>RDMA编程模型 (Verbs API):</strong></p>
<ul>
    <li><strong>SEND/RECV:</strong> 双向操作,需要对端CPU参与</li>
    <li><strong>WRITE:</strong> 单向写,无需对端CPU参与 (最高效)</li>
    <li><strong>READ:</strong> 单向读,从远程内存读取</li>
    <li><strong>ATOMIC:</strong> 原子操作,用于同步</li>
</ul>

<p><strong>RDMA传输模式:</strong></p>
<ul>
    <li><strong>RC (Reliable Connection):</strong> 可靠连接
        <ul>
            <li>特点: 点对点,保证顺序和可靠性</li>
            <li>适用: 大模型训练通信 (AllReduce)</li>
        </ul>
    </li>
    <li><strong>UD (Unreliable Datagram):</strong> 不可靠数据报
        <ul>
            <li>特点: 广播,低延迟,无保证</li>
            <li>适用: 监控、心跳</li>
        </ul>
    </li>
</ul>

<h3>2. InfiniBand vs RoCE 深度对比</h3>

<p><strong>InfiniBand (IB):</strong></p>
<ul>
    <li><strong>专用协议:</strong> 完整的RDMA协议栈,从物理层到传输层</li>
    <li><strong>性能:</strong> 极致低延迟 (< 1μs), 高带宽 (400/800Gbps)</li>
    <li><strong>可靠性:</strong> 硬件级错误检测和恢复</li>
    <li><strong>成本:</strong> 贵! 网卡+交换机都是专用
        <ul>
            <li>ConnectX-7网卡: $5000/张</li>
            <li>IB交换机: $50K-200K</li>
        </ul>
    </li>
    <li><strong>生态:</strong> NVIDIA主导,Mellanox (已被NVIDIA收购)</li>
    <li><strong>应用:</strong> 大厂AI集群主流 (腾讯/字节/OpenAI)</li>
</ul>

<p><strong>RoCE (RDMA over Converged Ethernet):</strong></p>
<ul>
    <li><strong>以太网上跑RDMA:</strong> 复用以太网基础设施</li>
    <li><strong>版本:</strong>
        <ul>
            <li>RoCEv1: 二层协议,只能同一VLAN</li>
            <li>RoCEv2: 三层协议,可跨路由,更通用</li>
        </ul>
    </li>
    <li><strong>性能:</strong> 延迟略高 (2-5μs), 带宽相同 (100/200/400Gbps)</li>
    <li><strong>成本:</strong> 比IB便宜30-50%</li>
    <li><strong>挑战:</strong>
        <ul>
            <li>需要无损以太网 (PFC, ECN)</li>
            <li>交换机配置复杂</li>
            <li>丢包率要求 < 0.01%</li>
        </ul>
    </li>
    <li><strong>应用:</strong> 中小规模集群,混合云</li>
</ul>

<p><strong>技术选型决策矩阵:</strong></p>
<pre>
场景                    选择        原因
-------------------------------------------------------
千卡+训练集群          IB          性能第一,延迟敏感
中小规模(<256卡)       RoCE        性价比高
混合云/多数据中心      RoCE        兼容性好
成本敏感              RoCE        便宜30-50%
极致性能追求          IB          <1μs延迟
</pre>

<h3>3. 网络拓扑架构</h3>

<p><strong>Fat-Tree拓扑 (最常用):</strong></p>
<pre>
         [Core交换机层]
        /    |    |    \
       /     |    |     \
  [Aggregation交换机层]
    /  \    /  \  /  \
   /    \  /    \/    \
 [ToR交换机层 - Top of Rack]
  |  |  |  |  |  |  |  |
 [服务器 - 每台8卡GPU]

特点:
- 任意两服务器带宽相同 (无阻塞)
- 容错性好 (多路径)
- 可扩展性强 (可到万卡+)
</pre>

<p><strong>Dragonfly拓扑 (新趋势):</strong></p>
<ul>
    <li>分组设计: 组内全连接,组间稀疏连接</li>
    <li>优势: 减少交换机数量,降低成本</li>
    <li>挑战: 路由复杂,负载均衡难</li>
</ul>

<h3>4. NVLink / NVSwitch</h3>

<p><strong>NVLink: GPU间高速互联</strong></p>
<ul>
    <li><strong>带宽:</strong> 600GB/s (NVLink4, H100)
        <ul>
            <li>vs PCIe 5.0: 128GB/s (快5倍!)</li>
        </ul>
    </li>
    <li><strong>延迟:</strong> < 1μs</li>
    <li><strong>应用:</strong> 单机内GPU通信 (TP并行)</li>
</ul>

<p><strong>NVSwitch: GPU全互联交换芯片</strong></p>
<ul>
    <li><strong>功能:</strong> 连接多个GPU,实现全互联</li>
    <li><strong>DGX H100:</strong> 8卡通过4个NVSwitch全连接</li>
    <li><strong>带宽:</strong> 每对GPU 600GB/s</li>
    <li><strong>应用:</strong> TP=8的硬件基础</li>
</ul>

<p><strong>单机内通信策略:</strong></p>
<pre>
场景          通信方式        带宽        适用并行
----------------------------------------------------
TP (同层)    NVLink          600GB/s     TP=8
DP (梯度)    NVLink+IB       混合        DP
PP (层间)    IB              400Gbps     PP
</pre>

<h3>5. NCCL (NVIDIA Collective Communication Library)</h3>

<p><strong>什么是NCCL?</strong></p>
<ul>
    <li>NVIDIA开发的GPU通信库</li>
    <li>封装了底层RDMA/NVLink细节</li>
    <li>提供高级通信原语 (AllReduce, AllGather等)</li>
</ul>

<p><strong>核心通信算子:</strong></p>

<p><span class="highlight">AllReduce (最常用)</span></p>
<pre>
所有GPU的数据聚合并广播回所有GPU
用途: 数据并行的梯度同步

示例: 4个GPU梯度求平均
GPU0: grad=[1,2,3] →
GPU1: grad=[4,5,6] → AllReduce → 所有GPU: [2.5, 3.5, 4.5]
GPU2: grad=[2,3,4] →
GPU3: grad=[3,4,5] →
</pre>

<p><span class="highlight">AllGather</span></p>
<pre>
收集所有GPU数据,拼接后广播
用途: 张量并行的参数收集
</pre>

<p><span class="highlight">ReduceScatter</span></p>
<pre>
聚合数据后分片发送
用途: ZeRO优化器
</pre>

<p><strong>NCCL优化技巧:</strong></p>
<ul>
    <li><strong>Ring AllReduce:</strong> 环形拓扑,减少带宽需求</li>
    <li><strong>Tree AllReduce:</strong> 树形拓扑,适合跨机器</li>
    <li><strong>通信计算overlap:</strong> NCCL自动overlap</li>
    <li><strong>环境变量调优:</strong>
<pre>
NCCL_IB_DISABLE=0  # 启用InfiniBand
NCCL_NET_GDR_LEVEL=3  # GPU Direct RDMA
NCCL_P2P_LEVEL=NVL  # 优先NVLink
</pre>
    </li>
</ul>

<h3>6. 网络性能调优</h3>

<p><strong>带宽测试:</strong></p>
<pre>
# IB带宽测试
ib_write_bw -d mlx5_0

# NCCL带宽测试
nccl-tests/build/all_reduce_perf -b 8 -e 128M -f 2 -g 8
</pre>

<p><strong>常见性能问题:</strong></p>
<ul>
    <li><strong>丢包:</strong> RoCE环境下,检查PFC配置</li>
    <li><strong>拥塞:</strong> 流量调度问题,检查ECN</li>
    <li><strong>慢节点:</strong> 某个GPU通信慢,拖累整体</li>
    <li><strong>路由不均:</strong> Fat-Tree负载不均衡</li>
</ul>

<p><strong>性能基准:</strong></p>
<pre>
环境: 8台DGX H100 (64卡), 400Gbps IB

AllReduce (70B模型梯度 280GB):
- 理论时间: 280GB / 400Gbps = 5.6s
- 实际时间: ~7s (效率 80%)
- 瓶颈: 跨机器IB带宽

TP通信 (单机NVLink):
- 带宽利用率: > 90%
- 延迟: < 1μs
</pre>
        `
    }
};
