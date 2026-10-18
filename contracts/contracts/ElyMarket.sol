// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ElyMarket
/// @notice Profiles, services and pay-when-done deals in USDC.
/// A deal holds the customer's money in this contract until the job is
/// confirmed, auto-released after a review window, or refunded.
/// The owner can change fees and settings but cannot move money held in deals.
contract ElyMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Funded,
        Delivered,
        Released,
        Refunded
    }

    struct ProfileInput {
        string name;
        string headline;
        string category;
        string city;
        string bio;
        string contact;
    }

    struct Profile {
        string name;
        string headline;
        string category;
        string city;
        string bio;
        string contact;
        uint64 updatedAt;
    }

    struct Service {
        string title;
        uint256 price;
        bool active;
    }

    struct Deal {
        address customer;
        address provider;
        uint256 amount;
        uint64 deadline;
        uint64 reviewEnds;
        Status status;
        string title;
    }

    uint256 public constant MAX_SERVICES = 8;
    uint16 public constant MAX_FEE_BPS = 100; // 1%
    uint64 public constant MAX_DEADLINE = 90 days;

    IERC20 public immutable usdc;
    address public treasury;
    uint16 public feeBps;
    uint64 public reviewWindow;

    IERC20 public discountToken;
    uint256 public discountMinBalance;
    uint16 public discountFeeBps;

    mapping(address => Profile) public profiles;
    mapping(address => Service[]) private _services;
    mapping(address => uint32) public jobsCompleted;
    mapping(address => uint256) public totalEarned;

    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) public deals;

    event ProfileSet(
        address indexed provider,
        string name,
        string headline,
        string category,
        string city
    );
    event ServiceAdded(address indexed provider, uint256 index, string title, uint256 price);
    event ServiceStatus(address indexed provider, uint256 index, bool active);
    event DealCreated(
        uint256 indexed id,
        address indexed customer,
        address indexed provider,
        uint256 amount,
        uint64 deadline,
        string title
    );
    event DealDelivered(uint256 indexed id, uint64 reviewEnds);
    event DealReleased(uint256 indexed id, address indexed provider, uint256 net, uint256 fee);
    event DealRefunded(uint256 indexed id, address indexed customer, uint256 amount);
    event FeeChanged(uint16 feeBps);
    event TreasuryChanged(address treasury);
    event ReviewWindowChanged(uint64 reviewWindow);
    event DiscountChanged(address token, uint256 minBalance, uint16 feeBps);

    constructor(
        address _usdc,
        address _treasury,
        uint16 _feeBps,
        uint64 _reviewWindow
    ) Ownable(msg.sender) {
        require(_usdc != address(0) && _treasury != address(0), "Zero address");
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        require(_reviewWindow >= 60 && _reviewWindow <= 30 days, "Bad window");
        usdc = IERC20(_usdc);
        treasury = _treasury;
        feeBps = _feeBps;
        reviewWindow = _reviewWindow;
    }

    // Profiles and services

    function setProfile(ProfileInput calldata p) external {
        require(bytes(p.name).length > 0 && bytes(p.name).length <= 60, "Name length");
        require(bytes(p.headline).length <= 100, "Headline too long");
        require(
            bytes(p.category).length > 0 && bytes(p.category).length <= 32,
            "Category length"
        );
        require(bytes(p.city).length <= 60, "City too long");
        require(bytes(p.bio).length <= 400, "Bio too long");
        require(bytes(p.contact).length <= 80, "Contact too long");

        profiles[msg.sender] = Profile({
            name: p.name,
            headline: p.headline,
            category: p.category,
            city: p.city,
            bio: p.bio,
            contact: p.contact,
            updatedAt: uint64(block.timestamp)
        });

        emit ProfileSet(msg.sender, p.name, p.headline, p.category, p.city);
    }

    function addService(string calldata title, uint256 price) external {
        require(profiles[msg.sender].updatedAt != 0, "Create a profile first");
        require(_services[msg.sender].length < MAX_SERVICES, "Too many services");
        require(bytes(title).length > 0 && bytes(title).length <= 80, "Title length");
        require(price > 0, "Price is zero");

        _services[msg.sender].push(Service({title: title, price: price, active: true}));
        emit ServiceAdded(msg.sender, _services[msg.sender].length - 1, title, price);
    }

    function setServiceActive(uint256 index, bool active) external {
        require(index < _services[msg.sender].length, "No such service");
        _services[msg.sender][index].active = active;
        emit ServiceStatus(msg.sender, index, active);
    }

    function getServices(address provider) external view returns (Service[] memory) {
        return _services[provider];
    }

    // Deals

    /// @notice Pay into the contract. The customer must approve USDC first.
    function createDeal(
        address provider,
        uint256 amount,
        string calldata title,
        uint64 deadline
    ) external nonReentrant returns (uint256 id) {
        require(provider != address(0) && provider != msg.sender, "Bad provider");
        require(amount > 0, "Amount is zero");
        require(bytes(title).length <= 100, "Title too long");
        require(
            deadline > block.timestamp && deadline <= block.timestamp + MAX_DEADLINE,
            "Bad deadline"
        );

        id = nextDealId++;
        deals[id] = Deal({
            customer: msg.sender,
            provider: provider,
            amount: amount,
            deadline: deadline,
            reviewEnds: 0,
            status: Status.Funded,
            title: title
        });

        emit DealCreated(id, msg.sender, provider, amount, deadline, title);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice The provider says the job is done. The review window starts.
    function markDelivered(uint256 id) external {
        Deal storage d = deals[id];
        require(d.provider == msg.sender, "Not the provider");
        require(d.status == Status.Funded, "Not funded");

        d.status = Status.Delivered;
        d.reviewEnds = uint64(block.timestamp) + reviewWindow;
        emit DealDelivered(id, d.reviewEnds);
    }

    /// @notice The customer confirms the job and the provider is paid.
    function release(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        require(d.customer == msg.sender, "Not the customer");
        require(d.status == Status.Funded || d.status == Status.Delivered, "Not open");
        _pay(id, d);
    }

    /// @notice After the review window, anyone can pay out a delivered job.
    function claimAfterReview(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        require(d.status == Status.Delivered, "Not delivered");
        require(block.timestamp >= d.reviewEnds, "Review window is open");
        _pay(id, d);
    }

    /// @notice The provider can refund any open deal. The customer can
    /// refund a deal that was never delivered once the deadline has passed.
    function refund(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        bool byProvider = msg.sender == d.provider &&
            (d.status == Status.Funded || d.status == Status.Delivered);
        bool byCustomer = msg.sender == d.customer &&
            d.status == Status.Funded &&
            block.timestamp > d.deadline;
        require(byProvider || byCustomer, "Refund not allowed");

        d.status = Status.Refunded;
        emit DealRefunded(id, d.customer, d.amount);
        usdc.safeTransfer(d.customer, d.amount);
    }

    function _pay(uint256 id, Deal storage d) private {
        d.status = Status.Released;

        uint256 fee = (d.amount * _feeFor(d.provider)) / 10_000;
        uint256 net = d.amount - fee;

        jobsCompleted[d.provider] += 1;
        totalEarned[d.provider] += net;
        emit DealReleased(id, d.provider, net, fee);

        if (fee > 0) {
            usdc.safeTransfer(treasury, fee);
        }
        usdc.safeTransfer(d.provider, net);
    }

    function _feeFor(address provider) private view returns (uint256) {
        if (address(discountToken) == address(0)) return feeBps;
        try discountToken.balanceOf(provider) returns (uint256 balance) {
            if (balance >= discountMinBalance) return discountFeeBps;
        } catch {}
        return feeBps;
    }

    // Owner settings. None of these can move money held in deals.

    function setFee(uint16 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        feeBps = _feeBps;
        emit FeeChanged(_feeBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit TreasuryChanged(_treasury);
    }

    function setReviewWindow(uint64 _reviewWindow) external onlyOwner {
        require(_reviewWindow >= 60 && _reviewWindow <= 30 days, "Bad window");
        reviewWindow = _reviewWindow;
        emit ReviewWindowChanged(_reviewWindow);
    }

    /// @notice Providers holding at least `minBalance` of `token` pay `bps`.
    /// Use the zero address to turn the discount off.
    function setDiscount(address token, uint256 minBalance, uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_BPS, "Fee too high");
        require(token == address(0) || token.code.length > 0, "Not a contract");
        discountToken = IERC20(token);
        discountMinBalance = minBalance;
        discountFeeBps = bps;
        emit DiscountChanged(token, minBalance, bps);
    }
}