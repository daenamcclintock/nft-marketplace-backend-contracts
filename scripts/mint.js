const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const PRICE = ethers.utils.parseEther("0.1")

const mint = async () => {
    const basicNft = await ethers.getContract("BasicNftTwo")
    console.log("Minting NFT...")
    const mintTransaction = await basicNft.mintNft()
    const mintTransactionReceipt = await mintTransaction.wait(1)
    console.log(
        `Minted tokenId ${mintTransactionReceipt.events[0].args.tokenId.toString()} from contract: ${
            basicNft.address
        }`
    )
    if (network.config.chainId == 31337) {
        // Moralis struggles if you move more than 1 block!
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })