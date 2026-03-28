# Quantitative Finance: Equations & Algorithms

A comprehensive reference of the mathematical models, equations, and algorithms used by hedge funds, quant desks, institutional investors, and trading firms across equities, fixed income, FX, derivatives, and multi-asset strategies.

---

## 1. Option Pricing & Derivatives

### 1.1 Black-Scholes-Merton (BSM) Model
The foundational European option pricing formula:

**Call:**
$$C = S_0 N(d_1) - K e^{-rT} N(d_2)$$

**Put:**
$$P = K e^{-rT} N(-d_2) - S_0 N(-d_1)$$

Where:
- $d_1 = \frac{\ln(S_0/K) + (r + \sigma^2/2)T}{\sigma\sqrt{T}}$
- $d_2 = d_1 - \sigma\sqrt{T}$
- $S_0$ = spot price, $K$ = strike, $r$ = risk-free rate, $T$ = time to expiry, $\sigma$ = volatility

### 1.2 The Greeks (Partial Derivatives of BSM)
- **Delta (Δ):** $\frac{\partial C}{\partial S} = N(d_1)$ — hedge ratio
- **Gamma (Γ):** $\frac{\partial^2 C}{\partial S^2} = \frac{N'(d_1)}{S\sigma\sqrt{T}}$ — convexity of price
- **Theta (Θ):** $\frac{\partial C}{\partial t} = -\frac{S N'(d_1)\sigma}{2\sqrt{T}} - rKe^{-rT}N(d_2)$ — time decay
- **Vega (ν):** $\frac{\partial C}{\partial \sigma} = S\sqrt{T} N'(d_1)$ — sensitivity to volatility
- **Rho (ρ):** $\frac{\partial C}{\partial r} = KTe^{-rT}N(d_2)$ — sensitivity to interest rates
- **Vanna:** $\frac{\partial^2 C}{\partial S \partial \sigma}$ — cross-gamma between spot and vol
- **Volga/Vomma:** $\frac{\partial^2 C}{\partial \sigma^2}$ — sensitivity of vega to volatility
- **Charm:** $\frac{\partial \Delta}{\partial t}$ — delta decay
- **Speed:** $\frac{\partial \Gamma}{\partial S}$ — rate of change of gamma

### 1.3 Binomial Tree Model (Cox-Ross-Rubinstein)
Discrete-time lattice for American and exotic options:
- $u = e^{\sigma\sqrt{\Delta t}}$, $d = e^{-\sigma\sqrt{\Delta t}} = 1/u$
- Risk-neutral probability: $p = \frac{e^{r\Delta t} - d}{u - d}$
- Option value at each node: $V = e^{-r\Delta t}[pV_u + (1-p)V_d]$
- For American options: $V = \max(\text{exercise value}, \text{continuation value})$

### 1.4 Trinomial Tree Model
Three branches per node for better convergence:
- $u = e^{\sigma\sqrt{2\Delta t}}$, $d = 1/u$, $m = 1$
- $p_u = \left(\frac{e^{r\Delta t/2} - e^{-\sigma\sqrt{\Delta t/2}}}{e^{\sigma\sqrt{\Delta t/2}} - e^{-\sigma\sqrt{\Delta t/2}}}\right)^2$

### 1.5 Monte Carlo Simulation for Option Pricing
Geometric Brownian Motion paths:
$$S_{t+\Delta t} = S_t \exp\left[(r - \frac{\sigma^2}{2})\Delta t + \sigma\sqrt{\Delta t}\, Z\right]$$
where $Z \sim N(0,1)$.

**Variance Reduction Techniques:**
- Antithetic variates
- Control variates
- Importance sampling
- Stratified sampling
- Quasi-random sequences (Sobol, Halton)

### 1.6 Finite Difference Methods (PDE Solvers)
Solve the Black-Scholes PDE: $\frac{\partial V}{\partial t} + \frac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + rS\frac{\partial V}{\partial S} - rV = 0$

- **Explicit method:** Forward in time, simple but requires small time steps
- **Implicit method (Crank-Nicolson):** Unconditionally stable, second-order accurate
- **ADI (Alternating Direction Implicit):** For multi-factor problems

### 1.7 Black Model (Black-76)
Pricing options on futures, caps, floors, swaptions:
$$C = e^{-rT}[FN(d_1) - KN(d_2)]$$
where $F$ = forward/futures price.

### 1.8 Garman-Kohlhagen Model
FX option pricing (extension of BSM with foreign rate $r_f$):
$$C = S_0 e^{-r_f T} N(d_1) - K e^{-r_d T} N(d_2)$$

### 1.9 Heston Stochastic Volatility Model
$$dS_t = \mu S_t\,dt + \sqrt{v_t} S_t\,dW_1$$
$$dv_t = \kappa(\theta - v_t)\,dt + \xi\sqrt{v_t}\,dW_2$$
$dW_1 \cdot dW_2 = \rho\,dt$

Parameters: $\kappa$ (mean reversion speed), $\theta$ (long-run variance), $\xi$ (vol of vol), $\rho$ (correlation).

### 1.10 SABR Model (Stochastic Alpha Beta Rho)
Popular for interest rate and FX vol surfaces:
$$dF = \alpha F^\beta\,dW_1$$
$$d\alpha = \nu\alpha\,dW_2$$
$dW_1 \cdot dW_2 = \rho\,dt$

Hagan's approximate implied vol formula used to calibrate the smile.

### 1.11 Local Volatility (Dupire)
$$\sigma^2_{loc}(K,T) = \frac{\frac{\partial C}{\partial T} + rK\frac{\partial C}{\partial K}}{\frac{1}{2}K^2\frac{\partial^2 C}{\partial K^2}}$$

### 1.12 Bachelier Model (Normal Model)
Used for negative rates/spreads:
$$C = (F - K)N(d) + \sigma_N\sqrt{T}\,n(d), \quad d = \frac{F-K}{\sigma_N\sqrt{T}}$$

### 1.13 Jump-Diffusion Models
**Merton Jump-Diffusion:**
$$\frac{dS}{S} = (\mu - \lambda k)\,dt + \sigma\,dW + J\,dN$$
$N$ = Poisson process (intensity $\lambda$), $J$ = jump size (log-normal).

**Kou Double-Exponential Jump-Diffusion:** Asymmetric up/down jumps.

### 1.14 Variance Gamma Model
$$X_t = \theta G_t + \sigma W_{G_t}$$
where $G_t$ is a Gamma process (time change). Captures skewness and kurtosis.

### 1.15 Longstaff-Schwartz (Least Squares Monte Carlo)
American option pricing via regression on simulated paths:
$$\hat{C}(S, t) = \sum_{k=0}^{K} \beta_k L_k(S)$$
where $L_k$ are basis functions (Laguerre polynomials, etc.).

### 1.16 FFT-Based Option Pricing (Carr-Madan)
Using the characteristic function $\phi$ of log-price:
$$C(K) = \frac{e^{-\alpha \ln K}}{\pi} \int_0^\infty e^{-iv\ln K} \psi(v)\,dv$$
Evaluated via Fast Fourier Transform.

### 1.17 Exotic Option Models
- **Barrier options:** Reflection principle, PDE with absorbing boundaries
- **Asian options:** Geometric average (closed-form), arithmetic average (MC/PDE)
- **Lookback options:** Running max/min tracking
- **Basket options:** Multi-asset MC with Cholesky-decomposed correlations
- **Cliquet/Ratchet options:** Forward-starting chain
- **Rainbow options:** Multi-dimensional integration
- **Digital/Binary options:** Discontinuous payoffs, replication spreads

---

## 2. Volatility Modeling & Surfaces

### 2.1 Historical/Realized Volatility
$$\sigma_{hist} = \sqrt{\frac{252}{n-1}\sum_{i=1}^n (r_i - \bar{r})^2}$$

### 2.2 EWMA (Exponentially Weighted Moving Average)
$$\sigma_t^2 = \lambda\sigma_{t-1}^2 + (1-\lambda)r_{t-1}^2$$
RiskMetrics default $\lambda = 0.94$ (daily).

### 2.3 GARCH(1,1) — Generalized Autoregressive Conditional Heteroskedasticity
$$\sigma_t^2 = \omega + \alpha r_{t-1}^2 + \beta \sigma_{t-1}^2$$
Constraint: $\alpha + \beta < 1$ for stationarity.

**Extensions:**
- **EGARCH:** Asymmetric response (Nelson): $\ln\sigma_t^2 = \omega + \alpha|z_{t-1}| + \gamma z_{t-1} + \beta\ln\sigma_{t-1}^2$
- **GJR-GARCH:** Leverage term: $\sigma_t^2 = \omega + (\alpha + \gamma I_{r<0})r_{t-1}^2 + \beta\sigma_{t-1}^2$
- **TGARCH:** Threshold GARCH
- **IGARCH:** Integrated GARCH ($\alpha + \beta = 1$)
- **FIGARCH:** Fractionally Integrated GARCH (long memory)
- **DCC-GARCH:** Dynamic Conditional Correlation (Engle)
- **BEKK-GARCH:** Multivariate volatility with positive-definite covariance

### 2.4 Implied Volatility Surface Construction
- **SVI (Stochastic Volatility Inspired):** $w(k) = a + b\{\rho(k-m) + \sqrt{(k-m)^2 + \sigma^2}\}$
- **SSVI:** Eliminates calendar spread arbitrage by construction
- **Vanna-Volga:** Three-point interpolation using ATM, 25Δ call/put vols
- **Cubic/Spline interpolation** across strikes and tenors
- **Arbitrage-free smoothing:** Butterfly and calendar spread constraints

### 2.5 Volatility Forecasting
- Realized variance: $RV_t = \sum_{i=1}^{n} r_{t,i}^2$ (high-frequency)
- Bi-power variation: Robust to jumps
- HAR-RV (Heterogeneous Autoregressive): $RV_{t+1} = c + \beta_d RV_t^{(d)} + \beta_w RV_t^{(w)} + \beta_m RV_t^{(m)}$
- Parkinson estimator: $\sigma^2 = \frac{1}{4\ln 2}(\ln H - \ln L)^2$
- Garman-Klass: Uses OHLC data
- Yang-Zhang: Combines overnight and intraday volatility
- Rogers-Satchell: Drift-independent estimator

### 2.6 VIX Calculation (CBOE Method)
$$VIX^2 = \frac{2}{T}\sum_i \frac{\Delta K_i}{K_i^2} e^{rT} Q(K_i) - \frac{1}{T}\left(\frac{F}{K_0} - 1\right)^2$$
Model-free implied volatility from a strip of options.

---

## 3. Fixed Income & Interest Rate Models

### 3.1 Bond Pricing Fundamentals
$$P = \sum_{i=1}^{n} \frac{C}{(1+y)^{t_i}} + \frac{F}{(1+y)^{t_n}}$$

**Duration (Macaulay):**
$$D = \frac{1}{P}\sum_{i=1}^{n} t_i \frac{CF_i}{(1+y)^{t_i}}$$

**Modified Duration:** $D_{mod} = \frac{D}{1+y/k}$

**Convexity:**
$$\text{Conv} = \frac{1}{P}\sum_{i=1}^{n} t_i(t_i+1)\frac{CF_i}{(1+y)^{t_i+2}}$$

**Price change approximation:** $\Delta P \approx -D_{mod}\,\Delta y + \frac{1}{2}\text{Conv}(\Delta y)^2$

**DV01 (Dollar Value of a Basis Point):** $DV01 = \frac{D_{mod} \cdot P}{10000}$

**Key Rate Duration (KRD):** Sensitivity to shifts at individual maturities on the yield curve.

### 3.2 Yield Curve Construction
- **Bootstrapping:** Sequential extraction of zero rates from bond prices
- **Nelson-Siegel:** $y(\tau) = \beta_0 + \beta_1\frac{1-e^{-\tau/\lambda}}{\tau/\lambda} + \beta_2\left(\frac{1-e^{-\tau/\lambda}}{\tau/\lambda} - e^{-\tau/\lambda}\right)$
- **Svensson:** Extension with two humps (adds $\beta_3$, $\lambda_2$ terms)
- **Cubic spline interpolation** with knot points
- **Monotone convex:** Hagan-West method for smooth forward curves

### 3.3 Short-Rate Models
- **Vasicek:** $dr = a(b - r)\,dt + \sigma\,dW$ (mean reverting, allows negative rates)
- **Cox-Ingersoll-Ross (CIR):** $dr = a(b-r)\,dt + \sigma\sqrt{r}\,dW$ (non-negative rates)
- **Hull-White (Extended Vasicek):** $dr = [\theta(t) - ar]\,dt + \sigma\,dW$ (calibrated to initial curve)
- **Black-Karasinski:** $d\ln r = [\theta(t) - a\ln r]\,dt + \sigma\,dW$ (log-normal rates)
- **Ho-Lee:** $dr = \theta(t)\,dt + \sigma\,dW$ (no mean reversion)
- **Black-Derman-Toy (BDT):** Log-normal short rate, time-dependent vol

### 3.4 HJM Framework (Heath-Jarrow-Morton)
Models the entire forward rate curve:
$$df(t,T) = \alpha(t,T)\,dt + \sigma(t,T)\,dW(t)$$
No-arbitrage drift restriction: $\alpha(t,T) = \sigma(t,T)\int_t^T \sigma(t,s)\,ds$

### 3.5 LIBOR Market Model (BGM — Brace-Gatarek-Musiela)
Models discrete forward LIBOR rates directly:
$$dL_i(t) = L_i(t)\left(\mu_i(t)\,dt + \sigma_i(t)\,dW(t)\right)$$
Used for caps, floors, swaptions.

### 3.6 Affine Term Structure Models
Yields are affine in state variables $X$:
$$y(t,T) = A(t,T) + B(t,T)X_t$$
Includes Vasicek, CIR, and multi-factor generalizations.

### 3.7 Credit Risk Models
- **Merton Structural Model:** Equity as call option on firm assets: $E = V N(d_1) - De^{-rT}N(d_2)$
- **KMV (Expected Default Frequency):** Distance-to-default: $DD = \frac{\ln(V/D) + (\mu - \sigma^2/2)T}{\sigma\sqrt{T}}$
- **Reduced-Form (Jarrow-Turnbull, Duffie-Singleton):** Default as Poisson event with hazard rate $\lambda(t)$
- **CDS pricing:** $\text{PV(protection leg)} = \text{PV(premium leg)}$
- **Credit triangle:** $s \approx \lambda \cdot (1 - R)$ where $s$ = spread, $R$ = recovery rate
- **Z-spread, OAS (Option-Adjusted Spread):** Spread over the benchmark curve

### 3.8 Mortgage & Prepayment Models
- **PSA model:** Standard prepayment speed assumption
- **CPR/SMM:** $SMM = 1 - (1 - CPR)^{1/12}$
- **OAS analysis:** Monte Carlo simulation of interest rate paths + prepayment model
- **Duration drift:** Negative convexity in MBS

---

## 4. Portfolio Theory & Optimization

### 4.1 Modern Portfolio Theory (Markowitz Mean-Variance)
$$\min_w \; w^T \Sigma w \quad \text{s.t.} \quad w^T \mu = \mu_p, \; w^T \mathbf{1} = 1$$

**Efficient frontier:** Set of portfolios maximizing return for given risk.

**Tangency portfolio (Maximum Sharpe):**
$$w^* = \frac{\Sigma^{-1}(\mu - r_f\mathbf{1})}{\mathbf{1}^T\Sigma^{-1}(\mu - r_f\mathbf{1})}$$

### 4.2 Capital Asset Pricing Model (CAPM)
$$E[R_i] = R_f + \beta_i(E[R_m] - R_f)$$
$$\beta_i = \frac{\text{Cov}(R_i, R_m)}{\text{Var}(R_m)}$$

**Security Market Line (SML):** Expected return vs. beta.

### 4.3 Arbitrage Pricing Theory (APT)
$$E[R_i] = R_f + \sum_{k=1}^K \beta_{ik}\lambda_k$$
Multi-factor model: $R_i = \alpha_i + \sum_k \beta_{ik}F_k + \epsilon_i$

### 4.4 Fama-French Factor Models
- **Three-Factor:** $R_i - R_f = \alpha + \beta_1(R_m - R_f) + \beta_2 \cdot SMB + \beta_3 \cdot HML + \epsilon$
- **Five-Factor (adds):** $+ \beta_4 \cdot RMW + \beta_5 \cdot CMA$
- **Six-Factor (adds):** $+ \beta_6 \cdot UMD$ (momentum)

Where: SMB = size, HML = value, RMW = profitability, CMA = investment, UMD = momentum.

### 4.5 Carhart Four-Factor Model
Adds momentum to Fama-French 3:
$$R_i - R_f = \alpha + \beta(R_m - R_f) + s\cdot SMB + h\cdot HML + u\cdot UMD + \epsilon$$

### 4.6 Black-Litterman Model
Combines equilibrium returns with investor views:
$$E[R] = [(\tau\Sigma)^{-1} + P^T\Omega^{-1}P]^{-1}[(\tau\Sigma)^{-1}\Pi + P^T\Omega^{-1}Q]$$
- $\Pi$ = implied equilibrium returns
- $P$ = view matrix, $Q$ = view returns, $\Omega$ = view uncertainty

### 4.7 Risk Parity / Equal Risk Contribution
Each asset contributes equally to portfolio risk:
$$w_i \frac{\partial \sigma_p}{\partial w_i} = \frac{\sigma_p}{n} \quad \forall i$$

$$RC_i = w_i \cdot \frac{(\Sigma w)_i}{w^T \Sigma w}$$

### 4.8 Hierarchical Risk Parity (HRP)
(Lopez de Prado) Tree-based clustering on correlation matrix → recursive bisection allocation. More robust than Markowitz to estimation error.

### 4.9 Kelly Criterion
Optimal bet sizing for maximum geometric growth:
$$f^* = \frac{p \cdot b - q}{b} = \frac{p(b+1) - 1}{b}$$
$p$ = win probability, $b$ = win/loss ratio, $q = 1 - p$.

**Continuous version:** $f^* = \frac{\mu - r}{\sigma^2}$

**Fractional Kelly:** Most practitioners use $f^*/2$ to reduce variance.

### 4.10 Mean-CVaR Optimization
$$\min_w \; CVaR_\alpha(w) \quad \text{s.t.} \quad w^T\mu \geq \mu_p$$
Solved as a linear program (Rockafellar-Uryasev).

### 4.11 Robust Optimization
- Worst-case returns within uncertainty set
- Resampled efficient frontier (Michaud)
- Shrinkage estimators for covariance (Ledoit-Wolf)

### 4.12 Covariance Matrix Estimation
- **Sample covariance:** $\hat{\Sigma} = \frac{1}{n-1}\sum(r_t - \bar{r})(r_t - \bar{r})^T$
- **Ledoit-Wolf shrinkage:** $\hat{\Sigma}_{shrunk} = \delta F + (1-\delta)\hat{\Sigma}$
- **Factor model covariance:** $\Sigma = B\Sigma_F B^T + D$
- **Graphical Lasso:** Sparse inverse covariance
- **Random Matrix Theory (Marchenko-Pastur):** Filter noise eigenvalues
- **Oracle Approximating Shrinkage (OAS)**
- **Minimum Covariance Determinant (MCD):** Robust to outliers

---

## 5. Risk Management

### 5.1 Value at Risk (VaR)

**Parametric (Variance-Covariance):**
$$VaR_\alpha = \mu_p + z_\alpha \sigma_p$$
(Portfolio-level: $\sigma_p = \sqrt{w^T\Sigma w}$)

**Historical Simulation:** Empirical quantile of past P&L.

**Monte Carlo VaR:** Simulate portfolio P&L distribution, take α-quantile.

**Cornish-Fisher VaR:** Adjusts for skewness and kurtosis:
$$VaR = \mu + \sigma\left[z + \frac{1}{6}(z^2-1)S + \frac{1}{24}(z^3-3z)(K-3) - \frac{1}{36}(2z^3-5z)S^2\right]$$

### 5.2 Expected Shortfall (CVaR / Conditional VaR)
$$ES_\alpha = E[L \mid L > VaR_\alpha] = \frac{1}{1-\alpha}\int_\alpha^1 VaR_u\,du$$
Coherent risk measure (satisfies sub-additivity).

### 5.3 Stress Testing & Scenario Analysis
- Historical scenarios (e.g., 2008 crisis, COVID crash)
- Hypothetical shocks (rates ±200bp, equity ±20%, vol spike)
- Reverse stress testing: Find scenarios that break the portfolio
- Sensitivity ladders: PV impact of incremental factor shifts

### 5.4 Extreme Value Theory (EVT)
**Generalized Pareto Distribution (GPD)** for tail modeling:
$$F_u(x) = 1 - \left(1 + \frac{\xi x}{\beta}\right)^{-1/\xi}$$

**Block Maxima:** Generalized Extreme Value (GEV) distribution.
Used for tail risk, catastrophe modeling, rare event estimation.

### 5.5 Copula Models
Model dependency structure separate from marginals:
- **Gaussian copula:** $C(u_1,...,u_n) = \Phi_n(\Phi^{-1}(u_1),...,\Phi^{-1}(u_n); \Sigma)$
- **Student-t copula:** Heavier tail dependence
- **Clayton:** Lower tail dependence
- **Gumbel:** Upper tail dependence
- **Frank:** Symmetric dependence
- **Vine copulas:** Pair-copula construction for high dimensions

### 5.6 Coherent Risk Measures (Artzner)
Properties: Translation invariance, sub-additivity, positive homogeneity, monotonicity.
ES is coherent; VaR is not (fails sub-additivity).

### 5.7 Risk Attribution
$$VaR_p = \sum_i w_i \cdot \frac{\partial VaR}{\partial w_i} = \sum_i MVaR_i$$
Component VaR, incremental VaR, marginal VaR decomposition.

---

## 6. Statistical & Econometric Methods

### 6.1 Linear Regression (OLS)
$$\hat{\beta} = (X^TX)^{-1}X^Ty$$
- $R^2$, adjusted $R^2$, t-statistics, F-test
- Heteroskedasticity-consistent standard errors (White, Newey-West)

### 6.2 Regularized Regression
- **Ridge:** $\min \|y - X\beta\|^2 + \lambda\|\beta\|_2^2$
- **LASSO:** $\min \|y - X\beta\|^2 + \lambda\|\beta\|_1$ (induces sparsity)
- **Elastic Net:** $\min \|y - X\beta\|^2 + \lambda_1\|\beta\|_1 + \lambda_2\|\beta\|_2^2$

### 6.3 Time Series Models
- **AR(p):** $X_t = c + \sum_{i=1}^p \phi_i X_{t-i} + \epsilon_t$
- **MA(q):** $X_t = \mu + \sum_{j=1}^q \theta_j \epsilon_{t-j} + \epsilon_t$
- **ARMA(p,q):** Combination of AR and MA
- **ARIMA(p,d,q):** Integrated ARMA (differencing for non-stationarity)
- **SARIMA:** Seasonal ARIMA
- **VAR (Vector Autoregression):** Multi-variate time series
- **VECM (Vector Error Correction):** Cointegrated systems
- **State-Space Models / Kalman Filter:** Dynamic factor estimation

### 6.4 Cointegration
**Engle-Granger:** Two-step residual-based test.
**Johansen:** Trace and max-eigenvalue tests for multivariate cointegration.
$$\Delta Y_t = \Pi Y_{t-1} + \sum_{i=1}^{k-1}\Gamma_i \Delta Y_{t-i} + \epsilon_t$$

### 6.5 Stationarity Tests
- **Augmented Dickey-Fuller (ADF):** Unit root test
- **Phillips-Perron:** Non-parametric correction
- **KPSS:** Stationarity as null hypothesis
- **Hurst exponent:** $E[R(n)/S(n)] = Cn^H$ — mean reversion ($H < 0.5$) vs. trending ($H > 0.5$)

### 6.6 Principal Component Analysis (PCA)
$$\Sigma = V\Lambda V^T$$
First 3 PCs of yield curve ≈ level, slope, curvature (explains ~99% of variance).
Used for dimensionality reduction in factor models and risk.

### 6.7 Independent Component Analysis (ICA)
Finds statistically independent components (beyond decorrelation). Used for signal extraction.

### 6.8 Kalman Filter
**Prediction:** $\hat{x}_{t|t-1} = A\hat{x}_{t-1} + Bu_t$
**Update:** $\hat{x}_{t|t} = \hat{x}_{t|t-1} + K_t(z_t - H\hat{x}_{t|t-1})$
$K_t$ = Kalman gain.

Applications: Estimating hidden states (alpha, regime, spread dynamics), dynamic hedging.

### 6.9 Hidden Markov Models (HMM)
Market regime detection (bull/bear/sideways):
- Transition matrix: $a_{ij} = P(S_{t+1}=j \mid S_t=i)$
- Emission probabilities: Return distributions per state
- Algorithms: Baum-Welch (EM), Viterbi (most likely path), Forward-Backward

### 6.10 Change-Point Detection
- **CUSUM:** Cumulative sum test
- **Bayesian Online Change-Point Detection**
- **PELT (Pruned Exact Linear Time)**

### 6.11 Maximum Likelihood Estimation (MLE)
$$\hat{\theta} = \arg\max_\theta \sum_{t=1}^T \ln f(r_t \mid \theta)$$
Used to calibrate GARCH, stochastic volatility, copulas, and many other models.

### 6.12 Bayesian Methods
$$P(\theta \mid D) \propto P(D \mid \theta)P(\theta)$$
- MCMC (Markov Chain Monte Carlo): Metropolis-Hastings, Gibbs sampling
- Bayesian VAR with Minnesota prior
- Bayesian portfolio optimization
- Particle filters (Sequential Monte Carlo)

---

## 7. Algorithmic Trading & Execution

### 7.1 Execution Algorithms
- **TWAP (Time-Weighted Average Price):** Equal slices over time
- **VWAP (Volume-Weighted Average Price):** Proportional to historical volume profile
$$VWAP = \frac{\sum_i P_i V_i}{\sum_i V_i}$$
- **Implementation Shortfall (IS):** Minimize slippage from decision price
- **POV (Percentage of Volume):** Participate at fixed % of market volume
- **Iceberg/Reserve:** Hidden liquidity, small visible tranches
- **Sniper/Liquidity-Seeking:** Hit dark pools and hidden orders

### 7.2 Optimal Execution (Almgren-Chriss)
Minimize expected cost + risk penalty:
$$\min_{x_t} \; E\left[\sum_t g(v_t)\right] + \lambda \cdot \text{Var}\left[\sum_t x_t (S_t - S_0)\right]$$

Temporary impact: $g(v) = \eta v$, permanent impact: $h(v) = \gamma v$

Optimal trading trajectory: closed-form solution based on risk aversion $\lambda$.

### 7.3 Market Impact Models
- **Square-root law:** $\Delta P \propto \sigma \sqrt{Q/V}$ (Q = order size, V = daily volume)
- **Kyle's Lambda:** $\Delta P = \lambda Q$ (permanent impact per unit traded)
- **Obizhaeva-Wang:** Transient impact with resilience
- **Gatheral (2010):** Power-law decay of impact

### 7.4 Market Microstructure Models
- **Kyle (1985):** Informed trader, market maker, noise traders
- **Glosten-Milgrom:** Bid-ask spread from adverse selection
- **Roll model:** $\text{Spread} = 2\sqrt{-\text{Cov}(\Delta P_t, \Delta P_{t-1})}$
- **PIN (Probability of Informed Trading):** Easley, Kiefer, O'Hara, Paperman
- **VPIN (Volume-Synchronized PIN):** Real-time flow toxicity
- **Hasbrouck information share:** Price discovery across venues
- **Bid-ask bounce:** Microstructure noise correction

### 7.5 Order Book Models
- **Limit Order Book (LOB) dynamics:** Arrival/cancellation rates
- **Queue position models**
- **Poisson order flow models**
- **Hawkes process:** Self-exciting point process for clustering of events
$$\lambda(t) = \mu + \sum_{t_i < t} \alpha e^{-\beta(t-t_i)}$$

### 7.6 Transaction Cost Analysis (TCA)
- Pre-trade: Estimated cost given order size, spread, volatility
- Post-trade: Actual slippage vs. various benchmarks (arrival price, VWAP, close)
- Cost decomposition: Spread + market impact + timing + opportunity

---

## 8. Quantitative Trading Strategies

### 8.1 Statistical Arbitrage / Pairs Trading
**Cointegration-based:**
$$\text{Spread}_t = \beta_0 + \beta_1 A_t - B_t$$
Trade when spread deviates $> k\sigma$ from mean, exit at mean.

**Ornstein-Uhlenbeck process:**
$$dX_t = \theta(\mu - X_t)\,dt + \sigma\,dW_t$$
Mean reversion speed $\theta$, half-life $= \ln(2)/\theta$.

### 8.2 Momentum Strategies
- **Cross-sectional momentum:** Rank assets by past return (e.g., 12-1 month), long winners, short losers
- **Time-series momentum:** $\text{Signal}_t = \text{sign}(r_{t-12:t-1})$ — trend following
- **Dual momentum:** Combines absolute and relative momentum
- **Momentum crashes:** Conditional on market state (Daniel & Moskowitz)

### 8.3 Mean Reversion
- Bollinger Bands: $\text{Upper/Lower} = \text{MA} \pm k\sigma$
- Z-score: $z_t = \frac{X_t - \mu}{\sigma}$
- Hurst exponent < 0.5 indicates mean-reverting series
- Half-life estimation from OU process

### 8.4 Factor Investing
- Value: Book-to-market, earnings yield, FCF yield
- Momentum: 12-1 month return
- Quality: ROE, earnings stability, low leverage
- Low volatility: Minimum variance, low beta
- Size: Small-cap premium
- Carry: Yield differential (FX, bonds, commodities)

### 8.5 Market Making
- **Avellaneda-Stoikov model:**
$$\delta^{ask} = \frac{1}{\gamma}\ln\left(1 + \frac{\gamma}{\kappa}\right) + \frac{(2q+1)}{2}\sqrt{\frac{\sigma^2\gamma}{2\kappa}\cdot(1 + \frac{\gamma}{\kappa})^{1+\kappa/\gamma}}$$
$\gamma$ = risk aversion, $\kappa$ = order arrival intensity, $q$ = inventory position.

- **Optimal quoting:** Adjust spreads based on inventory, volatility, and flow toxicity
- **Inventory management:** Mean-revert inventory to zero

### 8.6 Trend Following / CTA
- Moving average crossovers: Fast MA > Slow MA → Long
- Breakout systems: Donchian channels, Turtle Trading
- **Exponential moving average:** $EMA_t = \alpha P_t + (1-\alpha)EMA_{t-1}$, $\alpha = 2/(n+1)$
- Time-series momentum across asset classes (Moskowitz, Ooi, Pedersen)
- Risk-managed momentum: Scale position by inverse of realized vol

### 8.7 Relative Value / Convergence
- Yield curve trades (butterflies, flatteners, steepeners)
- Capital structure arbitrage: CDS vs. equity
- Convertible bond arbitrage: Delta-hedge the equity component
- Volatility arbitrage: Trade implied vs. realized vol
- Cross-asset basis trades

### 8.8 High-Frequency Trading (HFT) Concepts
- Latency arbitrage
- Order anticipation / momentum ignition (controversial)
- Statistical arbitrage at microsecond scale
- Optimal tick size and queue priority models
- Co-location and FPGA strategies

---

## 9. Machine Learning in Finance

### 9.1 Supervised Learning
- **Linear/Logistic Regression** — factor models, default prediction
- **Random Forests** — feature importance, nonlinear alpha
- **Gradient Boosted Trees (XGBoost, LightGBM, CatBoost)** — widely used for alpha signals, credit scoring
- **Support Vector Machines (SVM)** — classification of regimes or directional signals
- **Neural Networks (MLP, CNN, LSTM, Transformer)** — time series forecasting, NLP on filings

### 9.2 Unsupervised Learning
- **K-Means, DBSCAN** — asset clustering, regime identification
- **PCA / Autoencoders** — factor extraction, dimensionality reduction
- **t-SNE, UMAP** — visualization of high-dimensional financial data
- **Gaussian Mixture Models** — regime detection with soft assignments

### 9.3 Reinforcement Learning
- **Q-learning / Deep Q-Networks** — optimal execution, portfolio allocation
- **Policy Gradient (REINFORCE, PPO, A2C)** — continuous action spaces for trading
- **Multi-Armed Bandits** — strategy selection, dynamic allocation
- **Inverse RL** — learning reward functions from expert traders

### 9.4 Deep Learning Architectures
- **LSTM / GRU** — sequential return prediction, volatility forecasting
- **Temporal Convolutional Networks (TCN)** — efficient temporal feature extraction
- **Transformer / Attention** — multi-asset return prediction, NLP on news/filings
- **Variational Autoencoders (VAE)** — scenario generation, synthetic data
- **Generative Adversarial Networks (GAN)** — synthetic financial data, tail event generation
- **Graph Neural Networks (GNN)** — supply chain networks, interbank contagion

### 9.5 Natural Language Processing (NLP)
- Sentiment analysis on news, social media, earnings calls
- Named Entity Recognition on SEC filings
- Topic modeling (LDA) on central bank communications
- LLM-based (GPT, BERT) feature extraction and event detection
- Earnings call tone analysis (Loughran-McDonald dictionary)

### 9.6 Feature Engineering for ML
- Technical indicators as features (RSI, MACD, Bollinger, ATR)
- Cross-sectional rank features
- Rolling statistics (mean, vol, skew, kurtosis)
- Microstructure features (order imbalance, spread, depth)
- Fundamental ratios, analyst revisions
- Alternative data signals (satellite, web traffic, card transactions)

### 9.7 Model Validation / Overfitting Prevention
- Walk-forward optimization
- Purged K-fold cross-validation (avoid look-ahead bias)
- Combinatorial purged cross-validation (CPCV — Lopez de Prado)
- Deflated Sharpe Ratio: Adjusts for multiple testing
$$DSR = P\left[SR^* > 0 \mid \{SR_k\}\right]$$
- Minimum Backtest Length (MinBTL): Required track record for significance

---

## 10. Technical Analysis (Quantified)

### 10.1 Moving Averages
- SMA, EMA, WMA, DEMA, TEMA, Hull MA
- Crossover signals, golden/death cross (50/200 day)

### 10.2 Momentum / Oscillator Indicators
- **RSI:** $RSI = 100 - \frac{100}{1 + RS}$, $RS = \frac{\text{avg gain}}{\text{avg loss}}$
- **MACD:** $MACD = EMA_{12} - EMA_{26}$, Signal = $EMA_9(MACD)$
- **Stochastic Oscillator:** $\%K = \frac{C - L_{14}}{H_{14} - L_{14}} \times 100$
- **Williams %R, CCI, ROC, MFI**
- **ADX/DMI:** Trend strength

### 10.3 Volatility Indicators
- **Bollinger Bands:** $\text{Middle} \pm k\sigma$ (typically $k=2$, 20-day)
- **ATR (Average True Range):** $TR = \max(H-L, |H-C_{prev}|, |L-C_{prev}|)$
- **Keltner Channels:** EMA ± multiplier × ATR

### 10.4 Volume Indicators
- **OBV (On-Balance Volume):** Cumulative volume direction
- **VWAP and anchored VWAP**
- **Volume Profile / Market Profile**
- **Accumulation/Distribution Line**
- **Chaikin Money Flow**

### 10.5 Pattern Recognition (Quantified)
- Candlestick pattern classification algorithms
- Chart pattern detection (head and shoulders, triangles, flags) via algorithmic rules or ML
- Fibonacci retracement levels: 23.6%, 38.2%, 50%, 61.8%, 78.6%
- Elliott Wave automated counting algorithms

---

## 11. Foreign Exchange (FX) Models

### 11.1 Interest Rate Parity
**Covered:** $F = S \cdot \frac{1 + r_d}{1 + r_f}$

**Uncovered:** $E[S_{t+1}] = S_t \cdot \frac{1 + r_d}{1 + r_f}$

### 11.2 Purchasing Power Parity (PPP)
$$\frac{S_1}{S_0} = \frac{1 + \pi_d}{1 + \pi_f}$$

### 11.3 Carry Trade Model
$$\text{Return} = (r_{high} - r_{low}) + \Delta S$$
Risk: Crash risk, skewness of carry returns.

### 11.4 Fair Value Models
- **BEER (Behavioral Equilibrium Exchange Rate)**
- **FEER (Fundamental Equilibrium Exchange Rate)**
- **Real effective exchange rate (REER)** deviation from trend

### 11.5 FX Volatility Surface
- Risk reversals: $RR = \sigma_{25\Delta C} - \sigma_{25\Delta P}$ (skew)
- Butterflies: $BF = \frac{\sigma_{25\Delta C} + \sigma_{25\Delta P}}{2} - \sigma_{ATM}$ (kurtosis)
- Vanna-Volga method for pricing
- Malz interpolation

---

## 12. Monte Carlo & Numerical Methods

### 12.1 Random Number Generation
- Mersenne Twister (MT19937)
- Quasi-random: Sobol sequences, Halton sequences (better convergence for MC)
- Box-Muller transform: Uniform → Normal

### 12.2 Cholesky Decomposition
For correlated random variables: $\Sigma = LL^T$, then $Z_{corr} = LZ_{indep}$

### 12.3 Importance Sampling
Shift probability measure to sample rare events more frequently:
$$E_P[f(X)] = E_Q\left[f(X)\frac{dP}{dQ}\right]$$

### 12.4 Numerical Integration
- Gauss-Hermite quadrature (for expected values under normal)
- Simpson's rule, trapezoidal rule
- Gauss-Legendre quadrature

### 12.5 Root-Finding
- Newton-Raphson: $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}$ (e.g., implied volatility)
- Brent's method: Robust bracketing
- Bisection: Simple, guaranteed convergence

---

## 13. Performance Measurement

### 13.1 Risk-Adjusted Returns
- **Sharpe Ratio:** $SR = \frac{R_p - R_f}{\sigma_p}$
- **Sortino Ratio:** $\frac{R_p - R_f}{\sigma_{downside}}$ (only penalizes downside)
- **Calmar Ratio:** $\frac{\text{CAGR}}{\text{Max Drawdown}}$
- **Information Ratio:** $IR = \frac{\alpha}{\sigma_\epsilon}$ (active return / tracking error)
- **Treynor Ratio:** $\frac{R_p - R_f}{\beta_p}$
- **Omega Ratio:** $\Omega(\theta) = \frac{\int_\theta^\infty (1-F(r))\,dr}{\int_{-\infty}^\theta F(r)\,dr}$

### 13.2 Drawdown Analysis
- **Maximum Drawdown (MDD):** $MDD = \max_{t}\left(\frac{\text{Peak}_t - \text{Trough}_t}{\text{Peak}_t}\right)$
- Average drawdown, drawdown duration
- Underwater equity curve

### 13.3 Return Attribution
- **Brinson-Fachler:** Allocation + selection + interaction effects
- **Factor-based attribution:** Alpha + factor exposures × factor returns
- **Fixed income attribution:** Curve, spread, carry, rolldown, FX

### 13.4 Statistical Significance of Returns
- **t-statistic:** $t = \frac{SR \cdot \sqrt{n}}{\sqrt{1 - SR^2/(4n) \cdot (\text{kurt} - 1) + SR^2/(2n)}}$
- **Bailey-Lopez de Prado deflated Sharpe:** Adjusts for multiple strategies tested
- **Harvey-Liu-Zhu:** Required t-stat threshold accounting for data snooping

---

## 14. Stochastic Calculus Foundations

### 14.1 Itô's Lemma
If $dX = \mu\,dt + \sigma\,dW$, then for $f(X,t)$:
$$df = \left(\frac{\partial f}{\partial t} + \mu\frac{\partial f}{\partial X} + \frac{1}{2}\sigma^2\frac{\partial^2 f}{\partial X^2}\right)dt + \sigma\frac{\partial f}{\partial X}\,dW$$

### 14.2 Geometric Brownian Motion
$$dS = \mu S\,dt + \sigma S\,dW$$
$$S_T = S_0 \exp\left[(\mu - \sigma^2/2)T + \sigma W_T\right]$$

### 14.3 Girsanov's Theorem
Change of measure (real-world → risk-neutral):
$$\frac{dQ}{dP} = \exp\left(-\int_0^T \theta_t\,dW_t - \frac{1}{2}\int_0^T \theta_t^2\,dt\right)$$
$\theta_t = (\mu - r)/\sigma$ is the market price of risk.

### 14.4 Feynman-Kac Formula
Links PDE to conditional expectation:
$$f(x,t) = E^Q\left[e^{-r(T-t)}g(X_T) \mid X_t = x\right]$$

### 14.5 Martingale Representation
Every contingent claim in a complete market can be replicated:
$$V_t = V_0 + \int_0^t \phi_s\,dS_s$$

---

## 15. Optimization Algorithms

### 15.1 Convex Optimization
- Quadratic Programming (QP): Mean-variance, tracking error minimization
- Linear Programming (LP): Transaction cost minimization, CVaR
- Second-Order Cone Programming (SOCP): Robust portfolio optimization
- Semi-Definite Programming (SDP): Covariance estimation constraints

### 15.2 Non-Convex / Heuristic Methods
- Genetic algorithms / Evolutionary strategies: Strategy parameter optimization
- Simulated annealing: Global optimization with cooling schedule
- Particle swarm optimization
- Differential evolution

### 15.3 Gradient-Based
- Gradient descent / SGD: Neural network training
- Adam, RMSprop, AdaGrad: Adaptive learning rates
- L-BFGS: Quasi-Newton for smooth objectives
- Conjugate gradient

---

## 16. Alternative Data & Signals

### 16.1 Quantified Alternative Data Sources
- **Satellite imagery:** Parking lot counts, crop yields, oil storage → computer vision
- **Web scraping:** Product pricing, job postings, reviews
- **Credit card / transaction data:** Revenue nowcasting
- **Geolocation / foot traffic:** Store visit counts
- **Social media sentiment:** Twitter/Reddit NLP scores
- **Shipping / logistics data:** AIS vessel tracking
- **Patent filings, SEC filings (13F, 10-K):** NLP extraction
- **App downloads / web traffic:** Growth proxy
- **Weather data:** Commodity trading, energy demand

### 16.2 Signal Combination
- Z-score normalization and equal weighting
- IC (Information Coefficient) weighted combination
- Ensemble methods (bagging, boosting, stacking)
- Bayesian model averaging

---

## 17. Crypto / Digital Asset Specific

### 17.1 On-Chain Analytics
- NVT (Network Value to Transactions): $NVT = \frac{\text{Market Cap}}{\text{Daily Tx Volume}}$
- MVRV (Market Value to Realized Value)
- SOPR (Spent Output Profit Ratio)
- Hash rate and mining difficulty models
- Whale tracking, exchange flow analysis

### 17.2 DeFi Models
- Automated Market Maker (AMM): $x \cdot y = k$ (Uniswap constant product)
- Impermanent loss: $IL = \frac{2\sqrt{p}}{1+p} - 1$ where $p = P_1/P_0$
- Yield farming APY compounding
- Liquidation models for lending protocols

---

## 18. Regulation & Risk Frameworks

### 18.1 Basel III/IV Capital Requirements
- Risk-Weighted Assets (RWA)
- Internal Ratings-Based (IRB) approach: $K = LGD \cdot N\left[\frac{N^{-1}(PD) + \sqrt{\rho}N^{-1}(0.999)}{\sqrt{1-\rho}}\right] - PD \cdot LGD$
- Fundamental Review of the Trading Book (FRTB): Expected shortfall replaces VaR
- Stressed VaR, Incremental Risk Charge

### 18.2 GARCH-based Regulatory Models
- 10-day VaR scaling: $VaR_{10} = VaR_1 \times \sqrt{10}$ (or more sophisticated scaling)
- Backtesting: Basel traffic light system (green/yellow/red zones)

---

*This reference covers the core quantitative toolkit. Each topic has extensive literature and variations. The field continuously evolves, incorporating new mathematical and computational techniques, especially from machine learning and data science.*
