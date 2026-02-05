import * as overviewService from '../services/overviewService.js';

export async function getDataOverview(req, res) {
    const data = await overviewService.getDataOverview();

    res.status(200).json({
        success: true,
        message: 'Fetch full data overview successfully!',
        data
    });
}
