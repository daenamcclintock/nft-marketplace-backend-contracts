const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
        let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
        const PRICE = ethers.utils.parseEther("0.1")
        const TOKEN_ID = 0

        beforeEach(async () => {
            const accounts = await ethers.getSigners()
            console.log(accounts)
            const deployer = accounts[0]
            const user = accounts[1]
            await deployments.fixture(["all"])
            nftMarketplace = await ethers.getContract("NftMarketplace")
            basicNft = await ethers.getContract("BasicNft")
        })
    })