const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const TOKEN_ID = 0

const deleteItem = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const transaction = await nftMarketplace.deleteListing(basicNft.address, TOKEN_ID)
    await transaction.wait(1)
    console.log("NFT Deleted !")
    if (network.config.chainId == "31337") {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}


deleteItem()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error)
    process.exit(1)
})